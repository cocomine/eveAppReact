import React, {useRef} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {Text} from 'react-native-paper';

let Rates = 0.86; //匯率變數
//debug
let Total = {Total: 555, RMB: 10.5, HKD: 55.2, Add: 12.3, Shipping: 44.5};
let record = [
    {
        DataTime: '2022-08-05',
        Mark: [{
            MarkID: 1,
            color: Color.yellow,
            title: 'YELLOW'
        }, {
            MarkID: 2,
            color: 'none',
            title: 'NONE'
        }],
        Record: [{
            RecordID: 1,
            OrderNum: '05/04/013',
            Type: '40',
            Local: 'ABC',
            CargoNum: 'BMOU3148478',
            Remark: 'abc',
            RMB: 12.5,
            HKD: 15.2,
            Add: 44.2,
            Shipping: 44.2,
            Total: 12.5
        }, {
            RecordID: 2,
            OrderNum: '05/04/013',
            Type: '40',
            Local: 'ABC',
            CargoNum: 'BMOU3148478',
            Remark: 'abc',
            RMB: 12.5,
            HKD: 15.2,
            Add: 44.2,
            Shipping: 44.2,
            Total: 12.5
        }]
    },
    {
        DataTime: '2022-08-06',
        Mark: [],
        Record: [{
            RecordID: 3,
            OrderNum: '05/04/013',
            Type: '40',
            Local: 'ABC',
            CargoNum: 'BMOU3148478',
            Remark: 'abc',
            RMB: 12.5,
            HKD: 15.2,
            Add: 44.2,
            Shipping: 44.2,
            Total: 12.5
        }, {
            RecordID: 4,
            OrderNum: '05/04/013',
            Type: '40',
            Local: 'ABC',
            CargoNum: 'BMOU3148478',
            Remark: 'abc',
            RMB: 12.5,
            HKD: 15.2,
            Add: 44.2,
            Shipping: 44.2,
            Total: 12.5
        }, {
            RecordID: 5,
            OrderNum: '05/04/013',
            Type: '40',
            Local: 'ABC',
            CargoNum: 'BMOU3148478',
            Remark: 'abc',
            RMB: 12.5,
            HKD: 15.2,
            Add: 44.2,
            Shipping: 44.2,
            Total: 12.5
        }, {
            RecordID: 6,
            OrderNum: '05/04/013',
            Type: '40',
            Local: 'ABC',
            CargoNum: 'BMOU3148478',
            Remark: 'abc',
            RMB: 12.5,
            HKD: 15.2,
            Add: 44.2,
            Shipping: 44.2,
            Total: 12.5
        }]
    }
];

/* "紀錄"介面 */
const Home = ({}) => {
    const navigation = useNavigation(); //導航

    return (
        /* 頂部toolbar */
        <SafeAreaView style={{flex: 1}}>
            <Toolbar>
                <ToolBarView>
                    <TouchableOpacity activeOpacity={0.7}>
                        <ADIcon name={'left'} size={14} color={Color.white} backgroundColor={Color.primaryColor} style={{
                            padding: 10,
                            marginRight: 5
                        }}/>
                    </TouchableOpacity>
                    <Text style={{color: Color.white}}>0月 0000</Text>
                    <TouchableOpacity activeOpacity={0.7}>
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
                    <Text style={{color: Color.white}}>$ {Total.Total}</Text>
                </ToolBarView>
            </Toolbar>
            <Toolbar>
                <View style={{flex: 1}}>
                    <Text style={{
                        color: Color.white,
                        fontSize: 12,
                        textAlign: 'center'
                    }}>{'人民幣\n¥ ' + Total.RMB}</Text>
                </View>
                <View style={{flex: 1}}>
                    <Text style={{
                        color: Color.white,
                        fontSize: 12,
                        textAlign: 'center'
                    }}>{'港幣\n$ ' + Total.HKD}</Text>
                </View>
                <View style={{flex: 1}}>
                    <Text style={{
                        color: Color.white,
                        fontSize: 12,
                        textAlign: 'center'
                    }}>{'加收\n¥ ' + Total.Add}</Text>
                </View>
                <View style={{flex: 1}}>
                    <Text style={{
                        color: Color.white,
                        fontSize: 12,
                        textAlign: 'center'
                    }}>{'運費\n¥ ' + Total.Shipping}</Text>
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
                data={record}
                renderItem={({item}) =>
                    <DataPart data={item}/>}
            />
        </SafeAreaView>
    );
}

/* 內容render */
const DataPart = ({data}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    let date = moment(data.DataTime).locale('zh-hk');

    /* 判斷週末 */
    let weekColor = Color.darkColorLight //預設平日
    if(date.format('d') === '0'){
        weekColor = Color.danger; //星期日
    }else if(date.format('d') === '6'){
        weekColor = Color.primaryColor; //星期六
    }

    /* 數據內容 */
    const DataPartBody = ({item}) => {
        let isRMBShow = false //人民幣顯示
        let canHaptic = true;

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
                <Animated.View style={{backgroundColor: 'indianred', width: "100%", justifyContent: 'center'}}>
                    <Animated.View style={{
                        marginLeft: 'auto',
                        transform: [{translateX}, {rotate}]
                    }}>
                        <FW5Icon name={'trash-alt'} size={40} color={Color.white}/>
                    </Animated.View>
                </Animated.View>
            );
        }

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
                        ReactNativeHapticFeedback.trigger("effectTick");
                        canHaptic = false;
                    }
                }else if(value < (120 * -1)){
                    if(canHaptic === true){
                        ReactNativeHapticFeedback.trigger("effectTick");
                        canHaptic = false;
                    }
                }else{
                    canHaptic = true;
                }
            });

            //背景圖片
            return (
                <Animated.View style={{backgroundColor: 'cornflowerblue', width: "100%", justifyContent: 'center'}}>
                    <Animated.View style={{
                        marginRight: 'auto',
                        transform: [{translateX}, {rotate}]
                    }}>
                        <FW5Icon name={'edit'} size={40} color={Color.white}/>
                    </Animated.View>
                </Animated.View>
            );
        }

        /* 切換人民幣顯示 */
        const translateY = useRef(new Animated.Value(0)).current;
        function switchRMBShow(){
            if(isRMBShow){
                //關閉
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true
                }).start();
                isRMBShow = false;
            }else{
                //打開
                Animated.timing(translateY, {
                    toValue: -21 * PixelRatio.getFontScale(),
                    duration: 500,
                    useNativeDriver: true
                }).start();
                isRMBShow = true;
            }
        }

        /* 確認動作*/
        const swipeOpen = (direction) => {
            console.log(direction);
            if(direction === 'left'){

            }
            if(direction === 'right'){

            }
        }

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
                                    <Text style={{
                                        fontWeight: 'bold',
                                        color: Color.textGary
                                    }}>{item.CargoNum.slice(0, 4)}</Text>
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
                                    <SmailText color={Color.textGary}>折算</SmailText>$ {(item.RMB / Rates).toFixed(2)}
                                </Text>
                                <View style={{overflow: 'hidden', height: 22 * PixelRatio.getFontScale()}}>
                                    <Animated.View style={{flex: 1, transform: [{translateY}]}}>
                                        <Text style={{}}><SmailText color={Color.textGary}>港幣</SmailText>$ {item.HKD}
                                        </Text>
                                        <Text style={{}}><SmailText color={Color.textGary}>人民幣</SmailText>$ {item.RMB}</Text>
                                    </Animated.View>
                                </View>
                            </View>
                            <View style={style.dataPartShipping}>
                                <Text><SmailText color={Color.textGary}>加收</SmailText>$ {item.Add}</Text>
                                <Text><SmailText color={Color.textGary}>運費</SmailText>$ {item.Shipping}</Text>
                            </View>
                        </View>
                        <View>
                            <Text style={{color: Color.primaryColor, alignSelf: 'flex-end'}}>
                                <SmailText color={Color.textGary}>合計</SmailText>
                                HK$ {(item.RMB / 0.86 + item.HKD + item.Add + item.Shipping).toFixed(2)}
                            </Text>
                        </View>
                    </Animated.View>
                </TouchableNativeFeedback>
            </Swipeable>
        )
    }

    /* 備忘錄 */
    const DataPartMark = ({item}) => {
        return (
            <View style={{paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', marginVertical: -7}}>
                {item.color === 'none' ? <Text style={{color: Color.primaryColor, fontSize: 24}}>{' \u25e6 '}</Text> :
                    <Text style={{color: item.color, fontSize: 24}}>{' \u2022 '}</Text>}
                <Text style={{fontSize: 10}}>{item.title}</Text>
            </View>
        );
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
                    <Text style={{fontSize: 15, color: Color.primaryColor}}>HK$ 100.2</Text>
                </View>
            </View>

            {/* 備忘錄 */
                data.Mark.length > 0 ?
                    <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default}>
                        <View style={style.dataPartMark}>
                            {data.Mark.map((item) => (
                                <DataPartMark key={item.MarkID} item={item}/>
                            ))}
                        </View>
                    </TouchableNativeFeedback> : null
            }

            {/* 數據內容 */
                data.Record.map((item) => (
                    <DataPartBody key={item.RecordID} item={item}/>
                ))}
        </View>
    );
};

/* Home style */
const style = StyleSheet.create({
    row: {
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: "row",
    },
    dataPart: {
        borderColor: Color.darkColorLight,
        borderTopWidth: .7,
        borderBottomWidth: .7,
        marginBottom: 7,
    },
    dataPartHeard: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: .7,
        paddingVertical: 2,
        paddingHorizontal: 5
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