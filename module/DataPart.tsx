import {LayoutChangeEvent, Modal, PixelRatio, StyleSheet, ToastAndroid, useColorScheme, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import Animated, {
    interpolate,
    runOnJS,
    SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import {DB} from './SQLite.ts';
import moment from 'moment/moment';
import Swipeable, {SwipeableMethods} from 'react-native-gesture-handler/ReanimatedSwipeable';
import {Ripple} from './Ripple.tsx';
import {Color} from './Color.ts';
import {ActivityIndicator, IconButton, Portal, Snackbar, Text} from 'react-native-paper';
import FW5Icon from '@react-native-vector-icons/fontawesome5';
import {SmailText} from './SmailText.tsx';
import formatPrice from '../module/formatPrice';
import Decimal from 'decimal.js';
import ImageViewer from 'react-native-image-zoom-viewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {IImageInfo} from 'react-native-image-zoom-viewer/src/image-viewer.type.ts';
import {ResultSet} from 'react-native-sqlite-storage';
import {IRootStackParamList} from './IRootStackParamList.ts';
import {convertColor} from '../page/Note';

interface RecordRow {
    RecordID: number;
    DateTime: string;
    OrderNum: string;
    Type: string;
    Local: string;
    CargoNum: string;
    Remark: string;
    RMB: number;
    HKD: number;
    Add: number;
    Shipping: number;
    Images: string;
    Rate?: number;
}

interface RecordItem {
    RecordID: number;
    OrderNum: string;
    Type: string;
    Local: string;
    CargoNum: string;
    Remark: string;
    RMB: number;
    HKD: number;
    Add: number;
    Shipping: number;
    haveImage: boolean;
    Images: any[];
    Rate: number;
}

interface MarkItem {
    Color: string | null;
    Title: string;
    ID: number;
}

interface PackageItem {
    DateTime: Date;
    Mark: MarkItem[];
    Total: Decimal;
    Record: RecordItem[];
}

interface Total {
    Total: Decimal;
    RMB: Decimal;
    HKD: Decimal;
    Add: Decimal;
    Shipping: Decimal;
}

// 為從資料庫讀取的 row 定義一個類型
type NoteRow = {
    ID: number;
    DateTime: string;
    Color: string | null;
    Title?: string;
    Contact?: string;
};

/**
 * 備忘錄分組
 */
function groupingNote(package_list: PackageItem[] = [], result_set: ResultSet): PackageItem[] {
    for (let i = 0; i < result_set.rows.length; i++) {
        const row = result_set.rows.item(i) as NoteRow;
        const item_date = new Date(row.DateTime);
        const match_item = package_list.find(item => item.DateTime.getDate() === item_date.getDate()); //尋找相同日期

        // 檢查本身是否已經有記錄
        if (match_item) {
            //存在
            match_item.Mark.push({
                ID: row.ID,
                Color: convertColor(row.Color),
                Title: row.Title ?? row.Contact?.replaceAll('\n', ' ') ?? '',
            });
        } else {
            //不存在
            const index = package_list.findIndex(item => item.DateTime.getDate() < item_date.getDate());
            package_list.splice(index < 0 ? package_list.length : index, 0, {
                //如果尋找不到(-1), 則放到最後
                DateTime: item_date,
                Mark: [
                    {
                        ID: row.ID,
                        Color: convertColor(row.Color),
                        Title: row.Title ?? row.Contact?.replaceAll('\n', ' ') ?? '',
                    },
                ],
                Record: [],
                Total: new Decimal(0),
            });
        }
    }
    return package_list;
}

/**
 * 數據分組
 */
function groupData(result_set: ResultSet, rate: number): [PackageItem[], Total] {
    const package_list: PackageItem[] = [];
    const total: Total = {
        Total: new Decimal(0),
        RMB: new Decimal(0),
        HKD: new Decimal(0),
        Add: new Decimal(0),
        Shipping: new Decimal(0),
    };

    for (let i = 0; i < result_set.rows.length; i++) {
        let last_item = package_list[package_list.length - 1];
        const row: RecordRow = result_set.rows.item(i);
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
        let images: any[] = [];
        // catch error if not a valid JSON
        try {
            images = JSON.parse(row.Images);
        } catch (e: any) {
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

interface DataPartProps {
    data: PackageItem;
}

/**
 * 內容render
 */
const DataPart: React.FC<DataPartProps> = ({data}) => {
    const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
    const date = moment(data.DateTime).locale('zh-hk');
    const navigation = useNavigation<NativeStackNavigationProp<IRootStackParamList>>();

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
            navigation.navigate('AddRecord', {}),
        );
    };

    return (
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
                    <Ripple.Default onPress={() => navigation.navigate('NotePage', {showDay: date.toISOString()})}>
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
 */
const SwipeLeft = (_: SharedValue<number>, translation: SharedValue<number>) => {
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
            if (current > 150 && can_haptic.current) {
                runOnJS(ReactNativeHapticFeedback.trigger)('effectHeavyClick', {ignoreAndroidSystemSettings: true});
                can_haptic.current = false;
            } else if (current < -150 && can_haptic.current) {
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
 */
const SwipeRight = (_: SharedValue<number>, translation: SharedValue<number>) => {
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

interface DataPartBodyProps {
    item: RecordItem;
    id: number;
    dateTime: Date;
}

/**
 * 數據內容
 */
const DataPartBody: React.FC<DataPartBodyProps> = ({item, id, dateTime}) => {
    const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
    const navigation = useNavigation<NativeStackNavigationProp<IRootStackParamList>>(); //導航
    const is_rmb_show = useRef(false); //人民幣顯示
    const [confirm_msg, setConfirmMSG] = useState(false); //確認刪除訊息
    const [show_big_image, setShowBigImage] = useState(false); //大圖
    const [is_visible, setIsVisible] = useState(true); //是否顯示
    const ref = useRef<SwipeableMethods>(null);

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
            ref.current?.close();
            runOnJS(setIsVisible)(false);
        });
    }, [height]);
    const show = useCallback(() => {
        setIsVisible(true);
        height.value = withTiming(initial_height.current, {duration: 300});
    }, [height]);

    /* 初始化 */
    const onLayout = useCallback(
        ({nativeEvent}: LayoutChangeEvent) => {
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
        (direction: 'left' | 'right') => {
            //編輯
            if (direction === 'right') {
                navigation.navigate('EditRecord', {recordID: id});
                ref.current?.close();
            }
            //移除
            if (direction === 'left') {
                //刪除 async function
                const extracted = async () => {
                    try {
                        await DB.transaction(async tr => {
                            await tr.executeSql('DELETE FROM Record WHERE RecordID = ?', [id]);
                        });
                    } catch (e: any) {
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
    const images_viewer_list: IImageInfo[] = useMemo(() => {
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
                            JSON.stringify(item.Images),
                            item.Rate,
                        ],
                    );
                });
            } catch (e: any) {
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
                                <View style={{flexDirection: 'row'}}>
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 'bold',
                                            color: Color.textGary,
                                        }}>
                                        {item.CargoNum.slice(0, 4)}
                                    </Text>
                                    <Text style={{color: Color.textGary, fontSize: 13}}>
                                        {item.CargoNum.slice(4, 10) + '(' + item.CargoNum.slice(10) + ')'}
                                    </Text>
                                    <View style={STYLE.dataPartImageIcon}>
                                        {item.haveImage ? (
                                            <FW5Icon name={'image'} size={13} color={Color.textGary} />
                                        ) : null}
                                    </View>
                                </View>
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

interface DataPartMarkProps {
    item: MarkItem;
}

/**
 * 備忘錄
 */
const DataPartMark: React.FC<DataPartMarkProps> = ({item}) => {
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

const STYLE = StyleSheet.create({
    imageViewerCloseBtn: {
        borderColor: Color.white,
        borderStyle: 'solid',
        borderWidth: 1,
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
        fontSize: 12,
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
    dataPartImageIcon: {width: 13, alignItems: 'center', marginLeft: 5, justifyContent: 'center'},
});

export {DataPart, groupData, groupingNote};
export type {PackageItem, RecordItem, MarkItem, Total};
