import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Animated,
    FlatList,
    PixelRatio,
    SafeAreaView,
    StyleSheet,
    TouchableNativeFeedback,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import {Color} from '../module/Color';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import ADIcon from 'react-native-vector-icons/AntDesign';
import FW5Icon from 'react-native-vector-icons/FontAwesome5';
import {SmailText, styles, TouchableNativeFeedbackPresets} from '../module/styles';
import moment from 'moment';
import 'moment/min/locales';
import {Swipeable} from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Text} from 'react-native-paper';
import DB, {useSetting} from '../module/SQLite';
import formatPrice from '../module/formatPrice';
import SVGLostCargo from '../module/SVGLostCargo';
import SVGCargo from '../module/SVGCargo';

/* 紀錄分組 */
function group_data(ResultSet, Rate, Total_callback){
    const package_list = [];
    const total = {Total: 0, RMB: 0, HKD: 0, Add: 0, Shipping: 0};

    for(let i = 0 ; i < ResultSet.rows.length ; i++){
        let last_item = package_list[package_list.length - 1];
        const row = ResultSet.rows.item(i);
        const item_date = new Date(row.DateTime);

        //總數
        total.RMB += row.RMB;
        total.HKD += row.HKD;
        total.Add += row.Add;
        total.Shipping += row.Shipping;
        total.Total += (row.RMB / Rate) + row.HKD + row.Add + row.Shipping;

        //資料
        if(last_item && last_item.DateTime.getDay() === item_date.getDay()){
            //存在 & 相同日期
            last_item.Total += (row.RMB / Rate) + row.HKD + row.Add + row.Shipping;
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
                Total: row.Total
            });
        }else{
            //不存在 & 不相同的日期
            package_list.push({
                DateTime: item_date,
                Mark: [],
                Total: (row.RMB / Rate) + row.HKD + row.Add + row.Shipping,
                Record: [{
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
                    Total: row.Total
                }]
            });
        }
    }
    Total_callback(total);
    return package_list;
}

/* 備忘錄分組 */
function grouping_note(package_list = [], ResultSet){
    for(let i = 0 ; i < ResultSet.rows.length ; i++){
        const row = ResultSet.rows.item(i);
        const item_date = new Date(row.DateTime);
        const match_item = package_list.find((item) => item.DateTime.getDay() === item_date.getDay()); //尋找相同日期

        if(match_item){
            //存在
            match_item.Mark.push({
                ID: row.ID,
                Color: row.color,
                Title: row.Title || row.Contact
            });
        }else{
            //不存在
            const index = package_list.findIndex((item) => item.DateTime < item_date.getDay());
            package_list.splice(index, 0, {
                DataTime: item_date,
                Mark: [{
                    ID: row.ID,
                    Color: row.color,
                    Title: row.Title || row.Contact
                }],
                Record: []
            });
        }
    }
    return package_list;
}

/* "紀錄"介面 */
const Home = ({}) => {
    const navigation = useNavigation(); //導航
    const route = useRoute();
    const [Total, setTotal] = useState({Total: 0, RMB: 0, HKD: 0, Add: 0, Shipping: 0});
    const [Data, setData] = useState(null);
    const [ShowDay, setShowDay] = useState(new Date());
    const [setting] = useSetting();
    const listRef = useRef(null);

    /* 選擇顯示月份 */
    const NextMonth = useCallback(() => {
        let tmp = new Date(ShowDay);
        tmp.setMonth(ShowDay.getMonth() + 1);
        setShowDay(tmp);
    }, [ShowDay]);
    const LastMonth = useCallback(() => {
        let tmp = new Date(ShowDay);
        tmp.setMonth(ShowDay.getMonth() - 1);
        setShowDay(tmp);
    }, [ShowDay]);

    /* 自動跳轉顯示月份 */
    useEffect(() => {
        if(route.params){
            setShowDay(route.params.ShowDay);
        }
    }, [route]);

    /* 讀取 */
    useEffect(() => {
        /* 讀取紀錄 */
        DB.transaction(function(tr){
            console.log('顯示: ', moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY'));
            tr.executeSql(
                'SELECT * FROM Record WHERE STRFTIME(\'%m\', DateTime) = ? AND STRFTIME(\'%Y\', DateTime) = ? ORDER BY DateTime DESC',
                [moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY')], function(tx, rs){
                    let package_list = group_data(rs, setting['Rate'], (total) => {setTotal(total);});

                    /* 讀取備忘錄 */
                    DB.transaction(function(tr){
                        console.log('備忘錄顯示: ', moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY'));
                        tr.executeSql(
                            'SELECT * FROM Note WHERE STRFTIME(\'%m\', DateTime) = ? AND STRFTIME(\'%Y\', DateTime) = ? ORDER BY DateTime DESC ',
                            [moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY')], function(tx, rs){
                                if(rs.rows.length > 0){
                                    package_list = grouping_note(package_list);
                                }
                                setData(package_list);
                            }
                        );
                    }, function(error){
                        console.log('傳輸錯誤: ' + error.message);
                    }, function(){
                        console.log('已取得資料');
                    });

                }
            );
        }, function(error){
            console.log('傳輸錯誤: ' + error.message);
        }, function(){
            console.log('已取得資料');
        });
    }, [ShowDay, setting]);

    useEffect(() => {console.log('update');});
    /*  */
    useEffect(() => {
        if(Data != null){
            const index = Data.findIndex((item) => item.DateTime.getDay() === ShowDay.getDay());
            console.log(index);
            listRef.current.scrollToIndex({index: index < 0 ? 0 : index, viewOffset: 50});
        }
    }, [Data]);

    return (
        /* 頂部toolbar */
        <SafeAreaView style={{flex: 1}}>
            <Toolbar>
                <ToolBarView>
                    <TouchableOpacity activeOpacity={0.7} onPress={LastMonth}>
                        <ADIcon name={'left'} size={14} color={Color.white} backgroundColor={Color.primaryColor} style={{
                            padding: 10,
                            marginRight: 5
                        }}/>
                    </TouchableOpacity>
                    <Text style={{color: Color.white}}>{moment(ShowDay).format('M月 yyyy')}</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={NextMonth}>
                        <ADIcon name={'right'} size={14} color={Color.white} backgroundColor={Color.primaryColor} style={{
                            padding: 10,
                            marginLeft: 5
                        }}/>
                    </TouchableOpacity>
                </ToolBarView>
                <ToolBarView>
                    <TouchableOpacity activeOpacity={0.7}>
                        <ADIcon name={'search1'} size={16} color={Color.white} backgroundColor={Color.primaryColor} style={{padding: 10}}/>
                    </TouchableOpacity>
                    <SmailText color={Color.white}>本月總計</SmailText>
                    <Text style={{color: Color.white}}>$ {formatPrice(Total.Total.toFixed(2))}</Text>
                </ToolBarView>
            </Toolbar>
            <Toolbar>
                <View style={{flex: 1}}>
                    <Text style={{
                        color: Color.white,
                        fontSize: 12,
                        textAlign: 'center'
                    }}>{'人民幣\n¥ ' + formatPrice(Total.RMB.toFixed(2))}</Text>
                </View>
                <View style={{flex: 1}}>
                    <Text style={{
                        color: Color.white,
                        fontSize: 12,
                        textAlign: 'center'
                    }}>{'港幣\n$ ' + formatPrice(Total.HKD.toFixed(2))}</Text>
                </View>
                <View style={{flex: 1}}>
                    <Text style={{
                        color: Color.white,
                        fontSize: 12,
                        textAlign: 'center'
                    }}>{'加收\n¥ ' + formatPrice(Total.Add.toFixed(2))}</Text>
                </View>
                <View style={{flex: 1}}>
                    <Text style={{
                        color: Color.white,
                        fontSize: 12,
                        textAlign: 'center'
                    }}>{'運費\n¥ ' + formatPrice(Total.Shipping.toFixed(2))}</Text>
                </View>
            </Toolbar>

            {/* 增加紀錄 */}
            <TouchableOpacity style={style.addRecord} activeOpacity={0.8} onPress={() => navigation.navigate('AddRecord')}>
                <View>
                    <ADIcon name={'plus'} color={Color.white} size={18}/>
                </View>
            </TouchableOpacity>
            {/* 備忘錄 */}
            <TouchableOpacity style={style.addMark} activeOpacity={0.8}>
                <MaterialCommunityIcons name={'notebook-outline'} color={Color.white} size={18}/>
            </TouchableOpacity>

            {/* 內容 */}
            <FlatList
                data={Data}
                renderItem={({item}) => <DataPart data={item} Rate={setting['Rate']}/>}
                ref={listRef}
                ListFooterComponent={
                    <View style={{height: 120, justifyContent: 'center', alignItems: 'center'}}>
                        <SVGCargo height="60" width="180"/>
                        <Text>已經到底喇~~ (❁´◡`❁)</Text>
                    </View>}
                ListEmptyComponent={
                    <View style={{justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                        <SVGLostCargo height="100" width="300"/>
                        <Text>沒有資料... （；´д｀）ゞ</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

/* 內容render */
const DataPart = ({data, Rate}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    let date = moment(data.DataTime).locale('zh-hk');

    /* 判斷週末 */
    let weekColor = Color.darkColorLight; //預設平日
    if(date.format('d') === '0'){
        weekColor = Color.danger; //星期日
    }else if(date.format('d') === '6'){
        weekColor = Color.primaryColor; //星期六
    }

    return (
        /* 內容包裝 */
        <View style={[style.dataPart, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]} key={data.DataTime}>
            <View style={[style.row, style.dataPartHeard]}>
                <View style={style.row}>
                    <Text style={{fontSize: 20, marginRight: 10}}>{date.format('D')}</Text>
                    <Text style={[style.dataPartWeek, {backgroundColor: weekColor}]}>{date.format('dddd')}</Text>
                    <Text style={{fontSize: 10}}>{date.format('M.YYYY')}</Text>
                </View>
                <View>
                    <Text style={{fontSize: 15, color: Color.primaryColor}}>HK$ {formatPrice(data.Total.toFixed(2))}</Text>
                </View>
            </View>

            {/* 備忘錄 */
                data.Mark.length > 0 ?
                    <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default}>
                        <View style={style.dataPartMark}>
                            {data.Mark.map((item) => (
                                <DataPartMark key={item.MarkID} item={item} id={item.MarkID}/>
                            ))}
                        </View>
                    </TouchableNativeFeedback> : null
            }

            {/* 數據內容 */
                data.Record.map((item) => (
                    <DataPartBody key={item.RecordID} item={item} rate={Rate} id={item.RecordID}/>
                ))}
        </View>
    );
};

/* 數據內容 */
const DataPartBody = ({item, rate, id}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const isRMBShow = useRef(false); //人民幣顯示
    const canHaptic = useRef(true);

    /* 向左滑動 */
    const swipeRight = (progress, dragX) => {
        //背景動畫
        const translateX = dragX.interpolate({
            inputRange: [-120, 0],
            outputRange: [-20, 20],
            extrapolate: 'clamp'
        });
        const rotate = dragX.interpolate({
            inputRange: [-120, 0],
            outputRange: ['0deg', '70deg'],
            extrapolate: 'clamp'
        });
        //背景圖片
        return (
            <Animated.View style={{backgroundColor: 'indianred', width: '100%', justifyContent: 'center'}}>
                <Animated.View style={{
                    marginLeft: 'auto',
                    transform: [{translateX}, {rotate}]
                }}>
                    <FW5Icon name={'trash-alt'} size={40} color={Color.white}/>
                </Animated.View>
            </Animated.View>
        );
    };

    /* 向右滑動 */
    const swipeLeft = (progress, dragX) => {
        //背景動畫
        const translateX = dragX.interpolate({
            inputRange: [0, 120],
            outputRange: [-20, 20],
            extrapolate: 'clamp'
        });
        const rotate = dragX.interpolate({
            inputRange: [0, 120],
            outputRange: ['-70deg', '0deg'],
            extrapolate: 'clamp'
        });

        //體感觸摸
        dragX.addListener(({value}) => {
            if(value > 120){
                if(canHaptic === true){
                    ReactNativeHapticFeedback.trigger('effectTick');
                    canHaptic.current = false;
                }
            }else if(value < (120 * -1)){
                if(canHaptic === true){
                    ReactNativeHapticFeedback.trigger('effectTick');
                    canHaptic.current = false;
                }
            }else{
                canHaptic.current = true;
            }
        });

        //背景圖片
        return (
            <Animated.View style={{backgroundColor: 'cornflowerblue', width: '100%', justifyContent: 'center'}}>
                <Animated.View style={{
                    marginRight: 'auto',
                    transform: [{translateX}, {rotate}]
                }}>
                    <FW5Icon name={'edit'} size={40} color={Color.white}/>
                </Animated.View>
            </Animated.View>
        );
    };

    /* 切換人民幣顯示 */
    const translateY = useRef(new Animated.Value(0)).current;
    const switchRMBShow = useCallback(() => {
        if(isRMBShow.current){
            //關閉
            Animated.timing(translateY, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true
            }).start();
            isRMBShow.current = false;
        }else{
            //打開
            Animated.timing(translateY, {
                toValue: -21 * PixelRatio.getFontScale(),
                duration: 500,
                useNativeDriver: true
            }).start();
            isRMBShow.current = true;
        }
    }, []);

    /* 確認動作*/
    const swipeOpen = useCallback((direction) => {
        console.log(direction);
        if(direction === 'left'){
            //todo
        }
        if(direction === 'right'){
            //todo
        }
    }, []);

    return (
        <Swipeable renderRightActions={swipeRight} onSwipeableOpen={swipeOpen} leftThreshold={120} rightThreshold={120} renderLeftActions={swipeLeft} overshootFriction={8}>
            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={switchRMBShow}>
                <Animated.View style={[style.dataPartBody, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>

                    <View style={[style.row, {justifyContent: 'flex-start'}]}>
                        <View style={{marginRight: 10}}>
                            <Text style={{color: Color.textGary}}>{item.OrderNum}</Text>
                            <Text style={{color: Color.textGary, fontSize: 13}}>{item.Type}</Text>
                        </View>
                        <View>
                            <Text>{item.Local}</Text>
                            <Text style={{color: Color.textGary, fontSize: 13}}>
                                <Text style={{fontWeight: 'bold', color: Color.textGary}}>{item.CargoNum.slice(0, 4)}</Text>
                                {item.CargoNum.slice(4, 10) + '(' + item.CargoNum.slice(10) + ')'}
                            </Text>
                        </View>
                    </View>
                    <View>
                        <Text style={style.dataPartRemark}>{item.Remark === null ? '' : item.Remark}</Text>
                    </View>
                    <View style={[style.row, {justifyContent: 'flex-start'}]}>
                        <View style={{marginRight: 10}}>
                            <Text style={{color: Color.textGary, fontSize: 12}}>代付</Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text>
                                <SmailText color={Color.textGary}>折算</SmailText>$ {formatPrice((item.RMB / rate).toFixed(2))}
                            </Text>
                            <View style={{overflow: 'hidden', height: 22 * PixelRatio.getFontScale()}}>
                                <Animated.View style={{flex: 1, transform: [{translateY}]}}>
                                    <Text><SmailText color={Color.textGary}>港幣</SmailText>$ {formatPrice(item.HKD.toFixed(2))}</Text>
                                    <Text><SmailText color={Color.textGary}>人民幣</SmailText>$ {formatPrice(item.RMB.toFixed(2))}</Text>
                                </Animated.View>
                            </View>
                        </View>
                        <View style={style.dataPartShipping}>
                            <Text><SmailText color={Color.textGary}>加收</SmailText>$ {formatPrice(item.Add.toFixed(2))}</Text>
                            <Text><SmailText color={Color.textGary}>運費</SmailText>$ {formatPrice(item.Shipping.toFixed(2))}</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={{color: Color.primaryColor, alignSelf: 'flex-end'}}>
                            <SmailText color={Color.textGary}>合計</SmailText>
                            HK$ {formatPrice((item.RMB / rate + item.HKD + item.Add + item.Shipping).toFixed(2))}
                        </Text>
                    </View>
                </Animated.View>
            </TouchableNativeFeedback>
        </Swipeable>
    );
};

/* 備忘錄 */
const DataPartMark = ({item, id}) => {
    return (
        <View style={{paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', marginVertical: -7}}>
            {item.color === 'none' ? <Text style={{color: Color.primaryColor, fontSize: 24}}>{' \u25e6 '}</Text> :
                <Text style={{color: item.color, fontSize: 24}}>{' \u2022 '}</Text>}
            <Text style={{fontSize: 10}}>{item.title}</Text>
        </View>
    );
};

/* Home style */
const style = StyleSheet.create({
    row: {
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row'
    },
    dataPart: {
        borderColor: Color.darkColorLight,
        borderTopWidth: .7,
        borderBottomWidth: .7,
        marginBottom: 7
    },
    dataPartHeard: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: .7,
        paddingVertical: 2,
        paddingHorizontal: 5
    },
    dataPartBody: {
        paddingVertical: 5,
        paddingHorizontal: 5
    },
    dataPartWeek: {
        fontSize: 10,
        marginRight: 10,
        paddingVertical: 2,
        paddingHorizontal: 3,
        borderRadius: 5,
        color: Color.white
    },
    dataPartRemark: {
        color: Color.textGary,
        fontSize: 13,
        borderBottomWidth: 1.5,
        borderColor: Color.darkColorLight,
        borderStyle: 'dotted',
        alignSelf: 'flex-start'
    },
    dataPartShipping: {
        flex: 1,
        borderLeftWidth: .7,
        borderStyle: 'dashed',
        borderColor: Color.darkColorLight,
        marginLeft: '-10%',
        paddingLeft: 10
    },
    dataPartMark: {
        borderBottomWidth: .7,
        borderStyle: 'solid',
        borderColor: Color.darkColorLight,
        paddingBottom: 4
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
        zIndex: 5
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
        zIndex: 5
    }
});

export {Home};