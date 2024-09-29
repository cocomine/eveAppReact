import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    FlatList,
    Modal,
    PixelRatio,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View,
} from "react-native";
import { Color } from "../module/Color";
import { Toolbar, ToolBarView } from "../module/Toolbar";
import ADIcon from "react-native-vector-icons/AntDesign";
import FW5Icon from "react-native-vector-icons/FontAwesome5";
import { SmailText } from "../module/SmailText";
import moment from "moment";
import "moment/min/locales";
import { Swipeable } from "react-native-gesture-handler";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ActivityIndicator, Banner, IconButton, Portal, Snackbar, Text } from "react-native-paper";
import { DB, useSetting } from "../module/SQLite";
import formatPrice from "../module/formatPrice";
import SVGLostCargo from "../module/SVGLostCargo";
import SVGCargo from "../module/SVGCargo";
import { Ripple } from "../module/Ripple";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DateSelect } from "../module/DateSelect";
import { convertColor } from "./Note";
import ImageViewer from "react-native-image-zoom-viewer";

/* 紀錄分組 */
function group_data(ResultSet, Rate) {
    const package_list = [];
    const total = {Total: 0, RMB: 0, HKD: 0, Add: 0, Shipping: 0};

    for (let i = 0; i < ResultSet.rows.length; i++) {
        let last_item = package_list[package_list.length - 1];
        const row = ResultSet.rows.item(i);
        const item_date = new Date(row.DateTime);

        //總數
        total.RMB += row.RMB;
        total.HKD += row.HKD;
        total.Add += row.Add;
        total.Shipping += row.Shipping;
        total.Total += row.RMB / Rate + row.HKD + row.Add + row.Shipping;

        //資料
        if (last_item && last_item.DateTime.getDate() === item_date.getDate()) {
            //存在 & 相同日期
            last_item.Total += row.RMB / Rate + row.HKD + row.Add + row.Shipping;
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
                haveImage: JSON.parse(row.Images).length > 0,
                Images: JSON.parse(row.Images),
            });
        } else {
            //不存在 & 不相同的日期
            package_list.push({
                DateTime: item_date,
                Mark: [],
                Total: row.RMB / Rate + row.HKD + row.Add + row.Shipping,
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
                        haveImage: JSON.parse(row.Images).length > 0,
                        Images: JSON.parse(row.Images),
                    },
                ],
            });
        }
    }
    return [package_list, total];
}

/* 備忘錄分組 */
function grouping_note(package_list = [], ResultSet) {
    for (let i = 0; i < ResultSet.rows.length; i++) {
        const row = ResultSet.rows.item(i);
        const item_date = new Date(row.DateTime);
        const match_item = package_list.find(item => item.DateTime.getDate() === item_date.getDate()); //尋找相同日期

        if (match_item) {
            //存在
            match_item.Mark.push({
                ID: row.ID,
                Color: convertColor(row.Color),
                Title: row.Title ?? row.Contact,
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
                        Title: row.Title ?? row.Contact,
                    },
                ],
                Record: [],
                Total: 0,
            });
        }
    }
    return package_list;
}

/* "紀錄"介面 */
const Home = () => {
    const navigation = useNavigation(); //導航
    const RNroute = useRoute(); //路由
    const [Total, setTotal] = useState({Total: 0, RMB: 0, HKD: 0, Add: 0, Shipping: 0}); //總數
    const [Data, setData] = useState(null); //紀錄資料
    const [ShowDay, setShowDay] = useState(new Date()); //顯示日期
    const [isRefresh, setIsRefresh] = useState(true); //是否重新更新
    const [monthSelect, setMonthSelect] = useState(false); //月份選擇是否顯示
    const [setting] = useSetting(); //設定
    const listRef = useRef(null); //FlatList Ref

    /* 選擇顯示月份 */
    const NextMonth = useCallback(() => {
        let tmp = moment(ShowDay);
        tmp.add(1, 'M').endOf('month');

        setShowDay(tmp.toDate());
        setIsRefresh(true);
    }, [ShowDay]);
    const LastMonth = useCallback(() => {
        let tmp = moment(ShowDay);
        tmp.subtract(1, 'M').endOf('month');

        setShowDay(tmp.toDate());
        setIsRefresh(true);
    }, [ShowDay]);

    /* 自動跳轉顯示月份 */
    useEffect(() => {
        if (RNroute.params) {
            setShowDay(new Date(RNroute.params.ShowDay));
        }
    }, [RNroute]);

    /* 更新資料 */
    useEffect(() => {
        let package_list;

        /* 讀取紀錄 */
        DB.transaction(
            function (tr) {
                console.log('顯示: ', moment(ShowDay).format('DD/MM/YYYY'));
                tr.executeSql(
                    "SELECT * FROM Record WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ? ORDER BY DateTime DESC",
                    [moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY')],
                    function (tx, rs) {
                        const [data, total] = group_data(rs, setting['Rate']);
                        setTotal(total);
                        package_list = data;
                    },
                );
            },
            function (error) {
                console.log('傳輸錯誤: ' + error.message);
            },
            function () {
                /* 讀取備忘錄 */
                DB.transaction(
                    function (tr) {
                        console.log('備忘錄顯示: ', moment(ShowDay).format('DD/MM/YYYY'));
                        tr.executeSql(
                            "SELECT * FROM Note WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ? ORDER BY DateTime DESC ",
                            [moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY')],
                            function (tx, rs) {
                                if (rs.rows.length > 0) package_list = grouping_note(package_list, rs);
                                setData(package_list);
                            },
                        );
                    },
                    function (error) {
                        console.log('傳輸錯誤: ' + error.message);
                    },
                    function () {
                        console.log('已取得資料');
                        setIsRefresh(false);
                    },
                );
            },
        );
    }, [ShowDay, setting, DB]);

    /* 自動滑動最新紀錄 */
    useEffect(() => {
        if (Data != null) {
            const index = Data.findIndex(item => item.DateTime.getDate() === ShowDay.getDate());
            if (index > 0) {
                listRef.current.scrollToIndex({index: index});
            }
        }
    }, [Data]);

    /* 直接選擇月份 */
    const setMonth = useCallback(date => {
        setShowDay(date);
        setIsRefresh(true);
    }, []);

    /* 隱藏直接選擇月份 */
    const hideMonthSelect = useCallback(() => setMonthSelect(false), []);

    return (
        <SafeAreaView style={{flex: 1}}>
            {/*<React.StrictMode>*/}
            <Portal.Host>
                {/* 頂部toolbar */}
                <View style={{zIndex: 2, elevation: 2}}>
                    <Toolbar>
                        <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={LastMonth} />
                            <TouchableWithoutFeedback onPress={() => setMonthSelect(true)}>
                                <Text style={{color: Color.white}}>{moment(ShowDay).format('M月 yyyy')}</Text>
                            </TouchableWithoutFeedback>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={NextMonth} />
                        </ToolBarView>
                        <ToolBarView>
                            <IconButton
                                icon={'magnify'}
                                iconColor={Color.white}
                                onPress={() => navigation.navigate('Search')}
                            />
                            <SmailText color={Color.white}>本月總計</SmailText>
                            <Text style={{color: Color.white}}>$ {formatPrice(Total.Total.toFixed(2))}</Text>
                        </ToolBarView>
                        <DateSelect
                            visibility={monthSelect}
                            value={ShowDay}
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
                                {'人民幣\n¥ ' + formatPrice(Total.RMB.toFixed(2))}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text
                                style={{
                                    color: Color.white,
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}>
                                {'港幣\n$ ' + formatPrice(Total.HKD.toFixed(2))}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text
                                style={{
                                    color: Color.white,
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}>
                                {'加收\n$ ' + formatPrice(Total.Add.toFixed(2))}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text
                                style={{
                                    color: Color.white,
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}>
                                {'運費\n$ ' + formatPrice(Total.Shipping.toFixed(2))}
                            </Text>
                        </View>
                    </Toolbar>
                </View>
                <TouchableWithoutFeedback onPress={hideMonthSelect}>
                    <View style={[style.cover, {display: monthSelect ? undefined : 'none'}]} />
                </TouchableWithoutFeedback>

                {/* 增加紀錄 */}
                <TouchableOpacity
                    style={style.addRecord}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('AddRecord')}>
                    <View>
                        <ADIcon name={'plus'} color={Color.white} size={18} />
                    </View>
                </TouchableOpacity>
                {/* 備忘錄 */}
                <TouchableOpacity style={style.addMark} activeOpacity={0.8} onPress={() => navigation.navigate('Note')}>
                    <MaterialCommunityIcons name={'notebook-outline'} color={Color.white} size={18} />
                </TouchableOpacity>

                <View style={{flex: 1}}>
                    <NewFunctionBanner />
                    {/* 內容 */}
                    <FlatList
                        data={Data}
                        ref={listRef}
                        onRefresh={() => null}
                        refreshing={isRefresh}
                        renderItem={({item}) => <DataPart data={item} rate={setting['Rate']} />}
                        onScrollToIndexFailed={info => {
                            setTimeout(() => {
                                listRef.current.scrollToIndex({index: info.index});
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
                {/*</React.StrictMode>*/}
            </Portal.Host>
        </SafeAreaView>
    );
};

/* 內容render */
const DataPart = ({data, rate}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const date = moment(data.DateTime).locale('zh-hk');
    const navigation = useNavigation();

    /* 判斷週末 */
    let weekColor = Color.darkColorLight; //預設平日
    if (date.format('d') === '0') {
        weekColor = Color.danger; //星期日
    } else if (date.format('d') === '6') {
        weekColor = Color.primaryColor; //星期六
    }

    /* 創意新紀錄以這裏的日期 */
    const press = () => {
        AsyncStorage.setItem('Draft', JSON.stringify({date: date.toISOString()})).then(() =>
            navigation.navigate('AddRecord'),
        );
    };

    return (
        /* 內容包裝 */
        <View style={[style.dataPart, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
            <Ripple.Default onPress={press}>
                <View style={[style.row, style.dataPartHeard]}>
                    <View style={style.row}>
                        <Text style={{fontSize: 20, marginRight: 10}}>{date.format('D')}</Text>
                        <Text style={[style.dataPartWeek, {backgroundColor: weekColor}]}>{date.format('dddd')}</Text>
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
                        <View style={style.dataPartMark}>
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
                    <DataPartBody key={index} item={item} rate={rate} id={item.RecordID} dateTime={data.DateTime} />
                ))
            }
        </View>
    );
};

/* 數據內容 */
const DataPartBody = ({item, rate, id, dateTime}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const navigation = useNavigation(); //導航
    const isRMBShow = useRef(false); //人民幣顯示
    const canHaptic = useRef(true); //可否震動
    const [confirmMSG, setConfirmMSG] = useState(false); //確認刪除訊息
    const [showBigImage, setShowBigImage] = useState(false); //大圖
    const ref = useRef(null);

    /* 向左滑動 */
    const swipeRight = useCallback((progress, dragX) => {
        //背景動畫
        const translateX = dragX.interpolate({
            inputRange: [-120, 0],
            outputRange: [-20, 20],
            extrapolate: 'clamp',
        });
        const rotate = dragX.interpolate({
            inputRange: [-120, 0],
            outputRange: ['0deg', '70deg'],
            extrapolate: 'clamp',
        });
        //背景圖片
        return (
            <Animated.View style={{backgroundColor: 'indianred', width: '100%', justifyContent: 'center'}}>
                <Animated.View
                    style={{
                        marginLeft: 'auto',
                        transform: [{translateX}, {rotate}],
                    }}>
                    <FW5Icon name={'trash-alt'} size={40} color={Color.white} />
                </Animated.View>
            </Animated.View>
        );
    }, []);

    /* 向右滑動 */
    const swipeLeft = useCallback((progress, dragX) => {
        //背景動畫
        const translateX = dragX.interpolate({
            inputRange: [0, 120],
            outputRange: [-20, 20],
            extrapolate: 'clamp',
        });
        const rotate = dragX.interpolate({
            inputRange: [0, 120],
            outputRange: ['-70deg', '0deg'],
            extrapolate: 'clamp',
        });

        //體感觸摸
        dragX.addListener(({value}) => {
            if (value > 120) {
                if (canHaptic.current === true) {
                    ReactNativeHapticFeedback.trigger('effectTick');
                    canHaptic.current = false;
                }
            } else if (value < 120 * -1) {
                if (canHaptic.current === true) {
                    ReactNativeHapticFeedback.trigger('effectTick');
                    canHaptic.current = false;
                }
            } else {
                canHaptic.current = true;
            }
        });

        //背景圖片
        return (
            <Animated.View style={{backgroundColor: 'cornflowerblue', width: '100%', justifyContent: 'center'}}>
                <Animated.View
                    style={{
                        marginRight: 'auto',
                        transform: [{translateX}, {rotate}],
                    }}>
                    <FW5Icon name={'edit'} size={40} color={Color.white} />
                </Animated.View>
            </Animated.View>
        );
    }, []);

    /* 切換人民幣顯示 */
    const translateY = useRef(new Animated.Value(0)).current;
    const switchRMBShow = useCallback(() => {
        if (isRMBShow.current) {
            //關閉
            Animated.timing(translateY, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start();
            isRMBShow.current = false;
        } else {
            //打開
            Animated.timing(translateY, {
                toValue: -21 * PixelRatio.getFontScale(),
                duration: 500,
                useNativeDriver: true,
            }).start();
            isRMBShow.current = true;
        }
    }, []);

    /* 移除動畫 */
    const height = useRef(null);

    /* 動畫執行 */
    const hide = useCallback(() => {
        Animated.timing(height.current, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start(() => ref.current.close());
    }, []);
    const show = useCallback(() => {
        Animated.timing(height.current, {
            toValue: height.current._startingValue,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, []);

    /* 初始化 */
    const onLayout = useCallback(({nativeEvent}) => {
        if (height.current === null) height.current = new Animated.Value(nativeEvent.layout.height);
    }, []);

    /* 確認動作 */
    const swipeOpen = useCallback(
        direction => {
            //編輯
            if (direction === 'left') {
                navigation.navigate('EditRecord', {recordID: id});
                ref.current.close();
            }
            //移除
            if (direction === 'right') {
                DB.transaction(
                    function (tr) {
                        tr.executeSql('DELETE FROM Record WHERE RecordID = ?', [id]);
                    },
                    function (error) {
                        console.log('傳輸錯誤: ' + error.message); //debug
                    },
                    () => {
                        hide();
                        setConfirmMSG(true);
                    },
                );
            }
        },
        [id],
    );

    /* 顯示圖片 */
    const showImages = useCallback(() => {
        setShowBigImage(true);
    }, []);

    /* 圖片檢視器列表 */
    const imagesViewerList = useMemo(() => {
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
        DB.transaction(
            function (tr) {
                tr.executeSql('INSERT INTO Record VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
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
                    item.Images
                ]);
            },
            function (error) {
                console.log('傳輸錯誤: ' + error.message); //debug
            },
            function () {
                show();
                setConfirmMSG(false);
            },
        );
    }, [dateTime]);

    return (
        <Animated.View style={{height: height.current}} onLayout={onLayout}>
            <Swipeable
                ref={ref}
                renderRightActions={swipeRight}
                onSwipeableOpen={swipeOpen}
                leftThreshold={120}
                rightThreshold={120}
                renderLeftActions={swipeLeft}
                overshootFriction={20}>
                <Ripple.Default onPress={switchRMBShow} onLongPress={showImages}>
                    <Animated.View
                        style={[style.dataPartBody, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.row, {justifyContent: 'flex-start'}]}>
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
                                            <FW5Icon name={'image'} size={13} color={Color.textGary}/>
                                        </Text>
                                    ) : ''}
                                </Text>
                            </View>
                        </View>
                        <View>
                            <Text style={style.dataPartRemark}>
                                {item.Remark === null ? '' : item.Remark}
                            </Text>
                        </View>
                        <View style={[style.row, {justifyContent: 'flex-start'}]}>
                            <View style={{marginRight: 10}}>
                                <Text style={{color: Color.textGary, fontSize: 12}}>代付</Text>
                            </View>
                            <View style={{flex: 1}}>
                                <View style={{overflow: 'hidden', height: 22 * PixelRatio.getFontScale()}}>
                                    <Animated.View style={{flex: 1, transform: [{translateY}]}}>
                                        <Text>
                                            <SmailText color={Color.textGary}>折算</SmailText>${' '}
                                            {formatPrice((item.RMB / rate).toFixed(2))}
                                        </Text>
                                        <Text>
                                            <SmailText color={Color.textGary}>人民幣</SmailText>¥{' '}
                                            {formatPrice(item.RMB.toFixed(2))}
                                        </Text>
                                    </Animated.View>
                                </View>
                                <Text>
                                    <SmailText color={Color.textGary}>港幣</SmailText>${' '}
                                    {formatPrice(item.HKD.toFixed(2))}
                                </Text>
                            </View>
                            <View style={style.dataPartShipping}>
                                <Text>
                                    <SmailText color={Color.textGary}>加收</SmailText>${' '}
                                    {formatPrice(item.Add.toFixed(2))}
                                </Text>
                                <Text>
                                    <SmailText color={Color.textGary}>運費</SmailText>${' '}
                                    {formatPrice(item.Shipping.toFixed(2))}
                                </Text>
                            </View>
                        </View>
                        <View>
                            <Text style={{color: Color.primaryColor, alignSelf: 'flex-end'}}>
                                <SmailText color={Color.textGary}>合計</SmailText>
                                HK$ {formatPrice((item.RMB / rate + item.HKD + item.Add + item.Shipping).toFixed(2))}
                            </Text>
                        </View>
                    </Animated.View>
                </Ripple.Default>
            </Swipeable>
            <Portal>
                <Modal
                    visible={showBigImage}
                    transparent={true}
                    animationType={'fade'}
                    onRequestClose={() => setShowBigImage(false)}>
                    <ImageViewer
                        backgroundColor={'rgba(0,0,0,0.6)'}
                        imageUrls={imagesViewerList}
                        onCancel={() => setShowBigImage(false)}
                        loadingRender={() => <ActivityIndicator animating={true} />}
                        enableSwipeDown={true}
                        footerContainerStyle={{width: '100%', position: 'absolute', bottom: 20, zIndex: 9999}}
                        renderFooter={() => (
                            <View style={[style.row, {justifyContent: 'center'}]}>
                                <IconButton
                                    icon={'close'}
                                    size={30}
                                    iconColor={Color.white}
                                    style={style.imageViewerCloseBtn}
                                    onPress={() => setShowBigImage(false)}
                                />
                            </View>
                        )}
                    />
                </Modal>
                <Snackbar
                    visible={confirmMSG}
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
        AsyncStorage.getItem('newFunction').then((value) => {
            if (value !== '213') {
                setVisible(true);
            }
        })
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
const style = StyleSheet.create({
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

export {Home, group_data, DataPart, grouping_note};
