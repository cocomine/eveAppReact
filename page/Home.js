import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    FlatList,
    Modal,
    PixelRatio,
    StyleSheet,
    ToastAndroid,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View,
} from 'react-native';
import {Color} from '../module/Color';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import ADIcon from '@react-native-vector-icons/ant-design';
import FW5Icon from '@react-native-vector-icons/fontawesome5';
import {SmailText} from '../module/SmailText';
import moment from 'moment';
import 'moment/min/locales';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ActivityIndicator, Banner, IconButton, Portal, Snackbar, Text} from 'react-native-paper';
import {DB, useSetting} from '../module/SQLite';
import formatPrice from '../module/formatPrice';
import SVGLostCargo from '../module/SVGLostCargo';
import SVGCargo from '../module/SVGCargo';
import {Ripple} from '../module/Ripple';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DateSelect} from '../module/DateSelect';
import {convertColor} from './Note';
import ImageViewer from 'react-native-image-zoom-viewer';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
/** @typedef {import('@react-navigation/native-stack').NativeStackNavigationProp} NativeStackNavigationProp */
/** @typedef {import('@react-navigation/native').RouteProp} RouteProp */
/** @typedef {import('../module/IRootStackParamList').IRootStackParamList} RootStackParamList */
/** @typedef {import('react-native-reanimated').SharedValue} SharedValue */

/* 紀錄分組 */
function groupData(result_set, rate) {
    const package_list = [];
    const total = {
        Total: new Decimal(0),
        RMB: new Decimal(0),
        HKD: new Decimal(0),
        Add: new Decimal(0),
        Shipping: new Decimal(0),
    };

    for (let i = 0; i < result_set.rows.length; i++) {
        let last_item = package_list[package_list.length - 1];
        const row = result_set.rows.item(i);
        const item_date = new Date(row.DateTime);
        const item_total = new Decimal(row.RMB)
            .div(row.Rate ?? rate)
            .add(row.HKD)
            .add(row.Add)
            .add(row.Shipping);

        //總數
        total.RMB = total.RMB.add(row.RMB);
        total.HKD = total.HKD.add(row.HKD);
        total.Add = total.Add.add(row.Add);
        total.Shipping = total.Shipping.add(row.Shipping);
        total.Total = total.Total.add(item_total);

        //圖片
        let images = [];
        // catch error if not a valid JSON
        try {
            images = JSON.parse(row.Images);
        } catch (e) {
            console.log(e.message);
        }

        //資料
        if (last_item && last_item.DateTime.getDate() === item_date.getDate()) {
            //存在 & 相同日期
            last_item.Total = last_item.Total.add(item_total);
            last_item.Record.push({
                RecordID: row.RecordID,
                OrderNum: row.OrderNum,
                Type: row.Type,
                Local: row.Local,
                CargoNum: row.CargoNum,
                Remark: row.Remark,
                RMB: row.RMB,
                HKD: row.HKD,
                Add: row.Add,
                Shipping: row.Shipping,
                haveImage: images.length > 0,
                Images: images,
                Rate: row.Rate ?? rate,
            });
        } else {
            //不存在 & 不相同的日期
            package_list.push({
                DateTime: item_date,
                Mark: [],
                Total: item_total,
                Record: [
                    {
                        RecordID: row.RecordID,
                        OrderNum: row.OrderNum,
                        Type: row.Type,
                        Local: row.Local,
                        CargoNum: row.CargoNum,
                        Remark: row.Remark,
                        RMB: row.RMB,
                        HKD: row.HKD,
                        Add: row.Add,
                        Shipping: row.Shipping,
                        haveImage: images.length > 0,
                        Images: images,
                        Rate: row.Rate ?? rate,
                    },
                ],
            });
        }
    }
    return [package_list, total];
}

/* 備忘錄分組 */
function groupingNote(package_list = [], result_set) {
    for (let i = 0; i < result_set.rows.length; i++) {
        const row = result_set.rows.item(i);
        const item_date = new Date(row.DateTime);
        const match_item = package_list.find(item => item.DateTime.getDate() === item_date.getDate()); //尋找相同日期

        if (match_item) {
            //存在
            match_item.Mark.push({
                ID: row.ID,
                Color: convertColor(row.Color),
                Title: row.Title ?? row.Contact.replaceAll('\n', ' '),
            });
        } else {
            //不存在
            const index = package_list.findIndex(item => item.DateTime.getDate() < item_date.getDate());
            package_list.splice(index < 0 ? package_list.length : index, 0, {
                //如果尋找不到(-1), 側放到最後
                DateTime: item_date,
                Mark: [
                    {
                        ID: row.ID,
                        Color: convertColor(row.Color),
                        Title: row.Title ?? row.Contact.replaceAll('\n', ' '),
                    },
                ],
                Record: [],
                Total: 0,
            });
        }
    }
    return package_list;
}

/**
 * "紀錄"介面
 */
const Home = () => {
    /** @type {NativeStackNavigationProp<RootStackParamList, 'Main'>} **/
    const navigation = useNavigation(); //導航
    /** @type {RouteProp<RootStackParamList, 'Main'>} **/
    const route = useRoute(); //路由
    const [total, setTotal] = useState({
        Total: new Decimal(0),
        RMB: new Decimal(0),
        HKD: new Decimal(0),
        Add: new Decimal(0),
        Shipping: new Decimal(0),
    }); //總數
    const [data, setData] = useState(null); //紀錄資料
    const [show_day, setShowDay] = useState(new Date()); //顯示日期
    const [is_refresh, setIsRefresh] = useState(true); //是否重新更新
    const [month_select, setMonthSelect] = useState(false); //月份選擇是否顯示
    const [setting, settingForceRefresh] = useSetting(); //設定
    const list_ref = useRef(null); //FlatList Ref
    const insets = useSafeAreaInsets(); //安全區域

    /* 選擇顯示月份 */
    const nextMonth = useCallback(() => {
        let tmp = moment(show_day);
        tmp.add(1, 'M').endOf('month');

        setShowDay(tmp.toDate());
        setIsRefresh(true);
    }, [show_day]);
    const lastMonth = useCallback(() => {
        let tmp = moment(show_day);
        tmp.subtract(1, 'M').endOf('month');

        setShowDay(tmp.toDate());
        setIsRefresh(true);
    }, [show_day]);

    /* 更新資料 */
    const updateData = useCallback(async () => {
        setIsRefresh(true);
        settingForceRefresh();

        /* 讀取紀錄 */
        function queryRecords(show_day_1) {
            return new Promise(async resolve => {
                await DB.readTransaction(async tr => {
                    const [, rs] = await tr.executeSql(
                        "SELECT * FROM Record WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ? ORDER BY DateTime DESC",
                        [moment(show_day_1).format('MM'), moment(show_day_1).format('YYYY')],
                    );
                    resolve(rs);
                });
            });
        }

        // 讀取備忘錄
        function queryNotes(show_day_2) {
            return new Promise(async resolve => {
                await DB.readTransaction(async tr => {
                    const [, rs] = await tr.executeSql(
                        "SELECT * FROM Note WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ? ORDER BY DateTime DESC",
                        [moment(show_day_2).format('MM'), moment(show_day_2).format('YYYY')],
                    );
                    resolve(rs);
                });
            });
        }

        try {
            console.log('顯示:', moment(show_day).format('DD/MM/YYYY'));
            const rs = await queryRecords(show_day);
            console.log('已取得資料', rs.rows.length);
            const [data, total] = groupData(rs, setting.Rate);
            setTotal(total);

            console.log('備忘錄顯示:', moment(show_day).format('DD/MM/YYYY'));
            const rs1 = await queryNotes(show_day);
            console.log('已取得資料', rs1.rows.length);
            const data_have_note = rs1.rows.length > 0 ? groupingNote(data, rs1) : data;
            setData(data_have_note);
        } catch (e) {
            console.log('傳輸錯誤: ' + e.message);
            ToastAndroid.show('傳輸錯誤', ToastAndroid.SHORT);
        } finally {
            setIsRefresh(false);
        }
    }, [show_day, setting.Rate, settingForceRefresh]);

    /* 直接選擇月份 */
    const setMonth = useCallback(date => {
        setShowDay(date);
        setIsRefresh(true);
    }, []);

    /* 隱藏直接選擇月份 */
    const hideMonthSelect = useCallback(() => setMonthSelect(false), []);

    /* 重新整理資料 */
    useEffect(() => {
        if (route.params && route.params.settingForceRefreshAlert) {
            console.log('重新整理資料');
            updateData().then();
        }
    }, [route.params, updateData]);

    /* 自動跳轉顯示月份 */
    useEffect(() => {
        if (route.params && route.params.showDay) {
            setShowDay(new Date(route.params.showDay));
        }
    }, [route.params]);

    /* first time 更新資料 */
    useEffect(() => {
        updateData().then();
    }, [updateData]);

    /* 自動滑動最新紀錄 */
    useEffect(() => {
        if (data != null) {
            const index = data.findIndex(item => item.DateTime.getDate() === show_day.getDate());
            if (index > 0) {
                list_ref.current.scrollToIndex({index: index});
            }
        }
    }, [data, show_day]);

    return (
        <View style={{flex: 1}}>
            <Portal.Host>
                {/* 頂部toolbar */}
                <View style={{zIndex: 2, elevation: 2}}>
                    <Toolbar containerStyle={{paddingTop: insets.top}}>
                        <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={lastMonth} />
                            <TouchableWithoutFeedback onPress={() => setMonthSelect(true)}>
                                <Text style={{color: Color.white}}>{moment(show_day).format('M月 yyyy')}</Text>
                            </TouchableWithoutFeedback>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={nextMonth} />
                        </ToolBarView>
                        <ToolBarView>
                            {/*<IconButton
                                icon={'magnify'}
                                iconColor={Color.white}
                                onPress={() => navigation.navigate('Search')}
                            />*/}
                            <SmailText color={Color.white}>本月總計</SmailText>
                            <Text style={{color: Color.white}}>$ {formatPrice(total.Total.toFixed(2))}</Text>
                        </ToolBarView>
                        <DateSelect
                            visibility={month_select}
                            value={show_day}
                            onSelect={setMonth}
                            onDismiss={hideMonthSelect}
                        />
                    </Toolbar>
                    <Toolbar containerStyle={{zIndex: -1, elevation: -1}}>
                        <View style={{flex: 1}}>
                            <Text
                                style={{
                                    color: Color.white,
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}>
                                {'人民幣\n¥ ' + formatPrice(total.RMB.toFixed(2))}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text
                                style={{
                                    color: Color.white,
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}>
                                {'港幣\n$ ' + formatPrice(total.HKD.toFixed(2))}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text
                                style={{
                                    color: Color.white,
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}>
                                {'加收\n$ ' + formatPrice(total.Add.toFixed(2))}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text
                                style={{
                                    color: Color.white,
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}>
                                {'運費\n$ ' + formatPrice(total.Shipping.toFixed(2))}
                            </Text>
                        </View>
                    </Toolbar>
                </View>
                {month_select && (
                    <TouchableWithoutFeedback onPress={hideMonthSelect}>
                        <View style={[STYLE.cover]} />
                    </TouchableWithoutFeedback>
                )}

                {/* 增加紀錄 */}
                <TouchableOpacity
                    style={STYLE.addRecord}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('AddRecord')}>
                    <View>
                        <ADIcon name={'plus'} color={Color.white} size={18} />
                    </View>
                </TouchableOpacity>
                {/* 備忘錄 */}
                <TouchableOpacity style={STYLE.addMark} activeOpacity={0.8} onPress={() => navigation.navigate('Note')}>
                    <MaterialCommunityIcons name={'notebook-outline'} color={Color.white} size={18} />
                </TouchableOpacity>

                <View style={{flex: 1}}>
                    <NewFunctionBanner />
                    {/* 內容 */}
                    <FlatList
                        data={data}
                        ref={list_ref}
                        onRefresh={updateData}
                        refreshing={is_refresh}
                        renderItem={({item}) => <DataPart data={item} />}
                        onScrollToIndexFailed={info => {
                            setTimeout(() => {
                                list_ref.current.scrollToIndex({index: info.index});
                            }, 500);
                        }}
                        ListFooterComponent={
                            <View style={{height: 120, justifyContent: 'center', alignItems: 'center'}}>
                                <SVGCargo height="60" width="180" />
                                <Text>已經到底喇~~ （￣︶￣）↗ </Text>
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={{justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                                <SVGLostCargo height="100" width="300" />
                                <Text>沒有資料... Σ(っ °Д °;)っ</Text>
                            </View>
                        }
                    />
                </View>
            </Portal.Host>
        </View>
    );
};

/* 內容render */
const DataPart = ({data}) => {
    const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
    const date = moment(data.DateTime).locale('zh-hk');
    const navigation = useNavigation();

    /* 判斷週末 */
    let week_color = Color.darkColorLight; //預設平日
    if (date.format('d') === '0') {
        week_color = Color.danger; //星期日
    } else if (date.format('d') === '6') {
        week_color = Color.primaryColor; //星期六
    }

    /* 創意新紀錄以這裏的日期 */
    const press = () => {
        AsyncStorage.setItem('Draft', JSON.stringify({date: date.toISOString()})).then(() =>
            navigation.navigate('AddRecord'),
        );
    };

    return (
        /* 內容包裝 */
        <View style={[STYLE.dataPart, {backgroundColor: is_dark_mode ? Color.darkBlock : Color.white}]}>
            <Ripple.Default onPress={press}>
                <View style={[STYLE.row, STYLE.dataPartHeard]}>
                    <View style={STYLE.row}>
                        <Text style={{fontSize: 20, marginRight: 10}}>{date.format('D')}</Text>
                        <Text style={[STYLE.dataPartWeek, {backgroundColor: week_color}]}>{date.format('dddd')}</Text>
                        <Text style={{fontSize: 10}}>{date.format('M.YYYY')}</Text>
                    </View>
                    <View>
                        <Text
                            style={{
                                fontSize: 15,
                                color: Color.primaryColor,
                            }}>
                            HK$ {formatPrice(data.Total.toFixed(2))}
                        </Text>
                    </View>
                </View>
            </Ripple.Default>

            {
                /* 備忘錄 */
                data.Mark.length > 0 ? (
                    <Ripple.Default onPress={() => navigation.navigate('Note', {ShowDay: date.toISOString()})}>
                        <View style={STYLE.dataPartMark}>
                            {data.Mark.map((item, index) => (
                                <DataPartMark key={index} item={item} />
                            ))}
                        </View>
                    </Ripple.Default>
                ) : null
            }

            {
                /* 數據內容 */
                data.Record.map((item, index) => (
                    <DataPartBody key={index} item={item} id={item.RecordID} dateTime={data.DateTime} />
                ))
            }
        </View>
    );
};

/**
 * 滑動左側顯示編輯
 * @param {SharedValue<number>} progress 進度
 * @param {SharedValue<number>} translation 位移
 * @type {Function}
 */
const SwipeLeft = (progress, translation) => {
    const can_haptic = useRef(true); //可否震動

    //背景動畫
    const style_animation = useAnimatedStyle(() => {
        const translateX = interpolate(translation.value, [0, 120], [-20, 20], 'clamp');
        const rotate = interpolate(translation.value, [0, 120], [-70, 0], 'clamp');

        return {
            marginRight: 'auto',
            transform: [{translateX: translateX}, {rotate: rotate + 'deg'}],
        };
    });

    //體感觸摸
    useAnimatedReaction(
        () => translation.value,
        current => {
            if (current > 150 && can_haptic.current === true) {
                runOnJS(ReactNativeHapticFeedback.trigger)('effectHeavyClick', {ignoreAndroidSystemSettings: true});
                can_haptic.current = false;
            } else if (current < -150 && can_haptic.current === true) {
                runOnJS(ReactNativeHapticFeedback.trigger)('effectHeavyClick', {ignoreAndroidSystemSettings: true});
                can_haptic.current = false;
            } else if (current <= 150 && current >= -150) {
                can_haptic.current = true;
            }
        },
        [can_haptic],
    );

    //背景圖片
    return (
        <Animated.View style={{backgroundColor: 'cornflowerblue', width: '100%', justifyContent: 'center'}}>
            <Animated.View style={style_animation}>
                <FW5Icon name={'edit'} size={40} color={Color.white} />
            </Animated.View>
        </Animated.View>
    );
};

/**
 * 滑動右側顯示刪除
 * @param {SharedValue<number>} progress 進度
 * @param {SharedValue<number>} translation 位移
 * @type {Function}
 */
const SwipeRight = (progress, translation) => {
    //背景動畫
    const style_animation = useAnimatedStyle(() => {
        const translateX = interpolate(translation.value, [-120, 0], [-20, 20], 'clamp');
        const rotate = interpolate(translation.value, [-120, 0], [0, 70], 'clamp');

        return {
            marginLeft: 'auto',
            transform: [{translateX: translateX}, {rotate: rotate.toString() + 'deg'}],
        };
    });

    //背景圖片
    return (
        <View style={{backgroundColor: 'indianred', width: '100%', justifyContent: 'center'}}>
            <Animated.View style={style_animation}>
                <FW5Icon name={'trash-alt'} size={40} color={Color.white} />
            </Animated.View>
        </View>
    );
};

/* 數據內容 */
const DataPartBody = ({item, id, dateTime}) => {
    const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
    /** @type {NativeStackNavigationProp<RootStackParamList, 'Main'>} **/
    const navigation = useNavigation(); //導航
    const is_rmb_show = useRef(false); //人民幣顯示
    const [confirm_msg, setConfirmMSG] = useState(false); //確認刪除訊息
    const [show_big_image, setShowBigImage] = useState(false); //大圖
    const [is_visible, setIsVisible] = useState(true); //是否顯示
    const ref = useRef(null);

    /* 切換人民幣顯示 */
    const translate_y = useSharedValue(0);
    const switchRMBShow = useCallback(() => {
        if (is_rmb_show.current) {
            //關閉
            translate_y.value = withTiming(0, {duration: 500});
            is_rmb_show.current = false;
        } else {
            //打開
            translate_y.value = withTiming(-21 * PixelRatio.getFontScale(), {duration: 500});
            is_rmb_show.current = true;
        }
    }, [translate_y]);

    /* 移除動畫 */
    const height = useSharedValue(0);
    const initial_height = useRef(0);

    /* 動畫執行 */
    const hide = useCallback(() => {
        height.value = withTiming(0.1, {duration: 300}, () => {
            ref.current.close();
            runOnJS(setIsVisible)(false);
        });
    }, [height]);
    const show = useCallback(() => {
        setIsVisible(true);
        height.value = withTiming(initial_height.current, {duration: 300});
    }, [height]);

    /* 初始化 */
    const onLayout = useCallback(
        ({nativeEvent}) => {
            if (height.value === 0) {
                height.value = nativeEvent.layout.height;
                initial_height.current = nativeEvent.layout.height;
            }
        },
        [height],
    );

    const animated_height_style = useAnimatedStyle(() => ({
        height: height.value === 0 ? 'auto' : height.value,
    }));

    const animated_translate_y_style = useAnimatedStyle(() => ({
        transform: [{translateY: translate_y.value}],
    }));

    /* 確認動作 */
    const swipeOpen = useCallback(
        direction => {
            //編輯
            if (direction === 'right') {
                navigation.navigate('EditRecord', {recordID: id});
                ref.current.close();
            }
            //移除
            if (direction === 'left') {
                //刪除 async function
                const extracted = async () => {
                    try {
                        await DB.transaction(async tr => {
                            await tr.executeSql('DELETE FROM Record WHERE RecordID = ?', [id]);
                        });
                    } catch (e) {
                        console.log('傳輸錯誤: ' + e.message); //debug
                        ToastAndroid.show('傳輸錯誤', ToastAndroid.SHORT);
                        return;
                    }

                    hide();
                    setConfirmMSG(true);
                };

                extracted().then();
            }
        },
        [hide, id, navigation],
    );

    /* 顯示圖片 */
    const showImages = useCallback(() => {
        setShowBigImage(true);
    }, []);

    /* 圖片檢視器列表 */
    const images_viewer_list = useMemo(() => {
        return item.Images.map((assets, index) => ({
            url: 'data:image/jpeg;base64,' + assets.base64,
            width: assets.width,
            height: assets.height,
            props: {
                key: index,
            },
        }));
    }, [item.Images]);

    /* 取消刪除 */
    const undo = useCallback(() => {
        const extracted = async () => {
            try {
                await DB.transaction(async tr => {
                    await tr.executeSql(
                        'INSERT INTO Record (RecordID, DateTime, OrderNum, Type, CargoNum, Local, RMB, HKD, "Add", Shipping, Remark, Images, Rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            id,
                            moment(dateTime).format('yyyy-MM-DD'),
                            item.OrderNum,
                            item.Type,
                            item.CargoNum,
                            item.Local,
                            item.RMB,
                            item.HKD,
                            item.Add,
                            item.Shipping,
                            item.Remark,
                            item.Images.toString(),
                            item.Rate,
                        ],
                    );
                });
            } catch (e) {
                console.error('傳輸錯誤: ' + e.message);
                ToastAndroid.show('傳輸錯誤', ToastAndroid.SHORT);
                return;
            }

            show();
            setConfirmMSG(false);
        };

        extracted().then();
    }, [
        dateTime,
        id,
        item.Add,
        item.CargoNum,
        item.HKD,
        item.Images,
        item.Local,
        item.OrderNum,
        item.RMB,
        item.Rate,
        item.Remark,
        item.Shipping,
        item.Type,
        show,
    ]);

    return (
        <Animated.View style={[animated_height_style, {display: is_visible ? 'flex' : 'none'}]} onLayout={onLayout}>
            <Swipeable
                ref={ref}
                renderRightActions={SwipeRight}
                onSwipeableOpen={swipeOpen}
                leftThreshold={150}
                rightThreshold={150}
                renderLeftActions={SwipeLeft}
                overshootFriction={20}>
                <Ripple.Default onPress={switchRMBShow} onLongPress={showImages}>
                    <View style={[STYLE.dataPartBody, {backgroundColor: is_dark_mode ? Color.darkBlock : Color.white}]}>
                        <View style={[STYLE.row, {justifyContent: 'flex-start'}]}>
                            <View style={{marginRight: 10}}>
                                <Text style={{color: Color.textGary}}>{item.OrderNum}</Text>
                                <Text style={{color: Color.textGary, fontSize: 13}}>{item.Type}</Text>
                            </View>
                            <View style={{flex: 1}}>
                                <Text numberOfLines={2} ellipsizeMode={'tail'}>
                                    {item.Local}
                                </Text>
                                <Text style={{color: Color.textGary, fontSize: 13}}>
                                    <Text
                                        style={{
                                            fontWeight: 'bold',
                                            color: Color.textGary,
                                        }}>
                                        {item.CargoNum.slice(0, 4)}
                                    </Text>
                                    {item.CargoNum.slice(4, 10) + '(' + item.CargoNum.slice(10) + ')'}
                                    <View style={{width: 5}}></View>
                                    {item.haveImage ? (
                                        <Text>
                                            <FW5Icon name={'image'} size={13} color={Color.textGary} />
                                        </Text>
                                    ) : (
                                        ''
                                    )}
                                </Text>
                            </View>
                        </View>
                        <View>
                            <Text style={STYLE.dataPartRemark}>{item.Remark === null ? '' : item.Remark}</Text>
                        </View>
                        <View style={[STYLE.row, {justifyContent: 'flex-start'}]}>
                            <View style={{marginRight: 10}}>
                                <Text style={{color: Color.textGary, fontSize: 12}}>代付</Text>
                            </View>
                            <View style={{flex: 1}}>
                                <View style={{overflow: 'hidden', height: 22 * PixelRatio.getFontScale()}}>
                                    <Animated.View style={[{flex: 1}, animated_translate_y_style]}>
                                        <Text>
                                            <SmailText color={Color.textGary}>折算</SmailText>${' '}
                                            {formatPrice(new Decimal(item.RMB).div(item.Rate).toFixed(2))}
                                        </Text>
                                        <Text>
                                            <SmailText color={Color.textGary}>人民幣</SmailText>¥{' '}
                                            {formatPrice(new Decimal(item.RMB).toFixed(2))}
                                        </Text>
                                    </Animated.View>
                                </View>
                                <Text>
                                    <SmailText color={Color.textGary}>港幣</SmailText>${' '}
                                    {formatPrice(new Decimal(item.HKD).toFixed(2))}
                                </Text>
                            </View>
                            <View style={STYLE.dataPartShipping}>
                                <Text>
                                    <SmailText color={Color.textGary}>加收</SmailText>${' '}
                                    {formatPrice(new Decimal(item.Add).toFixed(2))}
                                </Text>
                                <Text>
                                    <SmailText color={Color.textGary}>運費</SmailText>${' '}
                                    {formatPrice(new Decimal(item.Shipping).toFixed(2))}
                                </Text>
                            </View>
                        </View>
                        <View>
                            <Text style={{color: Color.primaryColor, alignSelf: 'flex-end'}}>
                                <SmailText color={Color.textGary}>合計</SmailText>
                                HK${' '}
                                {formatPrice(
                                    new Decimal(item.RMB)
                                        .div(item.Rate)
                                        .add(item.HKD)
                                        .add(item.Add)
                                        .add(item.Shipping)
                                        .toFixed(2),
                                )}
                            </Text>
                        </View>
                    </View>
                </Ripple.Default>
            </Swipeable>
            <Portal>
                <Modal
                    visible={show_big_image}
                    transparent={true}
                    animationType={'fade'}
                    onRequestClose={() => setShowBigImage(false)}>
                    <ImageViewer
                        backgroundColor={'rgba(0,0,0,0.6)'}
                        imageUrls={images_viewer_list}
                        onCancel={() => setShowBigImage(false)}
                        loadingRender={() => <ActivityIndicator animating={true} />}
                        enableSwipeDown={true}
                        footerContainerStyle={{width: '100%', position: 'absolute', bottom: 20, zIndex: 9999}}
                        renderFooter={() => (
                            <View style={[STYLE.row, {justifyContent: 'center'}]}>
                                <IconButton
                                    icon={'close'}
                                    size={30}
                                    iconColor={Color.white}
                                    style={STYLE.imageViewerCloseBtn}
                                    onPress={() => setShowBigImage(false)}
                                />
                            </View>
                        )}
                    />
                </Modal>
                <Snackbar
                    visible={confirm_msg}
                    onDismiss={() => setConfirmMSG(false)}
                    action={{
                        label: '復原',
                        onPress: undo,
                    }}>
                    已經刪除1個紀錄
                </Snackbar>
            </Portal>
        </Animated.View>
    );
};

/* 備忘錄 */
const DataPartMark = ({item}) => {
    return (
        <View style={{paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center'}}>
            {item.Color === null ? (
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderWidth: 0.7,
                        borderColor: Color.primaryColor,
                        borderRadius: 8 / 2,
                        marginHorizontal: 10,
                    }}
                />
            ) : (
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 8 / 2,
                        backgroundColor: item.Color,
                        marginHorizontal: 10,
                    }}
                />
            )}
            <Text style={{fontSize: 12, flex: 1}} numberOfLines={1} ellipsizeMode={'tail'}>
                {item.Title}
            </Text>
        </View>
    );
};

/* 宣傳新功能 */
const NewFunctionBanner = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('newFunction').then(value => {
            if (value !== '213') {
                setVisible(true);
            }
        });
    }, []);

    return (
        <Banner
            visible={visible}
            actions={[
                {
                    label: '了解(不再顯示)',
                    onPress: () => {
                        setVisible(false);
                        AsyncStorage.setItem('newFunction', '213');
                    },
                },
                {
                    label: '了解',
                    onPress: () => setVisible(false),
                },
            ]}
            icon={'new-box'}>
            <View>
                <Text style={{fontSize: 18}}>新功能!!</Text>
                <Text style={{flex: 1}}>現在除了可以匯出pdf亦可以匯出excel囉!!</Text>
            </View>
        </Banner>
    );
};

/* Home style */
const STYLE = StyleSheet.create({
    imageViewerCloseBtn: {
        borderColor: Color.white,
        borderStyle: 'solid',
        borderWidth: 1,
    },
    cover: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 1,
        zIndex: 1,
    },
    row: {
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
    },
    dataPart: {
        borderColor: Color.darkColorLight,
        borderTopWidth: 0.7,
        borderBottomWidth: 0.7,
        marginBottom: 7,
    },
    dataPartHeard: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: 0.7,
        paddingVertical: 2,
        paddingHorizontal: 5,
    },
    dataPartBody: {
        paddingVertical: 5,
        paddingHorizontal: 5,
    },
    dataPartWeek: {
        fontSize: 10,
        marginRight: 10,
        paddingVertical: 2,
        paddingHorizontal: 3,
        borderRadius: 5,
        color: Color.white,
    },
    dataPartRemark: {
        color: Color.textGary,
        fontSize: 13,
        borderBottomWidth: 1.5,
        borderColor: Color.darkColorLight,
        borderStyle: 'dotted',
        alignSelf: 'flex-start',
    },
    dataPartShipping: {
        flex: 1,
        borderLeftWidth: 0.7,
        borderStyle: 'dashed',
        borderColor: Color.darkColorLight,
        marginLeft: '-10%',
        paddingLeft: 10,
    },
    dataPartMark: {
        borderBottomWidth: 0.7,
        borderStyle: 'solid',
        borderColor: Color.darkColorLight,
        paddingVertical: 4,
    },
    addRecord: {
        backgroundColor: Color.primaryColor,
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 57,
        height: 57,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        zIndex: 5,
    },
    addMark: {
        backgroundColor: Color.secondary,
        position: 'absolute',
        bottom: 20,
        right: 90,
        width: 40,
        height: 40,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        zIndex: 5,
    },
});

export {Home, groupData, DataPart, groupingNote};
