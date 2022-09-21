import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Animated,
    FlatList,
    PixelRatio,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View
} from 'react-native';
import {Color} from '../module/Color';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import ADIcon from 'react-native-vector-icons/AntDesign';
import FW5Icon from 'react-native-vector-icons/FontAwesome5';
import {SmailText} from '../module/SmailText';
import moment from 'moment';
import 'moment/min/locales';
import {Swipeable} from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {IconButton, Portal, Snackbar, Text, useTheme} from 'react-native-paper';
import {DB, useSetting} from '../module/SQLite';
import formatPrice from '../module/formatPrice';
import SVGLostCargo from '../module/SVGLostCargo';
import SVGCargo from '../module/SVGCargo';
import {Ripple} from '../module/Ripple';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReAnimated, {FadeInUp, FadeOutUp} from 'react-native-reanimated';

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
        if(last_item && last_item.DateTime.getDate() === item_date.getDate()){
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
        const match_item = package_list.find((item) => item.DateTime.getDate() === item_date.getDate()); //尋找相同日期

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
const Home = () => {
    const navigation = useNavigation(); //導航
    const RNroute = useRoute(); //路由
    const [Total, setTotal] = useState({Total: 0, RMB: 0, HKD: 0, Add: 0, Shipping: 0}); //總數
    const [Data, setData] = useState(null); //紀錄資料
    const [ShowDay, setShowDay] = useState(new Date()); //顯示日期
    const [isRefresh, setIsRefresh] = useState(false); //是否重新更新
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
        if(RNroute.params){
            setShowDay(new Date(RNroute.params.ShowDay));
        }
    }, [RNroute]);

    /* 更新資料 */
    useEffect(() => {
        let package_list;

        /* 讀取紀錄 */
        DB.transaction(function(tr){
            console.log('顯示: ', moment(ShowDay).format('DD/MM/YYYY'));
            tr.executeSql(
                'SELECT * FROM Record WHERE STRFTIME(\'%m\', DateTime) = ? AND STRFTIME(\'%Y\', DateTime) = ? ORDER BY DateTime DESC',
                [moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY')], function(tx, rs){
                    package_list = group_data(rs, setting['Rate'], (total) => {setTotal(total);});
                }
            );
        }, function(error){
            console.log('傳輸錯誤: ' + error.message);
        }, function(){

            /* 讀取備忘錄 */
            DB.transaction(function(tr){
                console.log('備忘錄顯示: ', moment(ShowDay).format('DD/MM/YYYY'));
                tr.executeSql(
                    'SELECT * FROM Note WHERE STRFTIME(\'%m\', DateTime) = ? AND STRFTIME(\'%Y\', DateTime) = ? ORDER BY DateTime DESC ',
                    [moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY')], function(tx, rs){
                        if(rs.rows.length > 0) package_list = grouping_note(package_list);
                    }
                );
            }, function(error){
                console.log('傳輸錯誤: ' + error.message);
            }, function(){
                console.log('已取得資料');
                setData(package_list);
                setIsRefresh(false);
            });
        });
    }, [ShowDay, setting, DB]);

    /* 自動滑動最新紀錄 */
    useEffect(() => {
        if(Data != null){
            const index = Data.findIndex((item) => item.DateTime.getDate() === ShowDay.getDate());
            if(index > 0){
                listRef.current.scrollToIndex({index: index});
            }
        }
    }, [Data]);

    /* 直接選擇月份 */
    const setMonth = useCallback((date) => {
        setShowDay(date);
        setIsRefresh(true);
    }, []);

    /* 隱藏直接選擇月份 */
    const hideMonthSelect = useCallback(() => setMonthSelect(false), []);

    return (
        /* 頂部toolbar */
        <SafeAreaView style={{flex: 1, position: 'relative'}}>
            {/*<React.StrictMode>*/}
            <Portal.Host>
                <View style={{zIndex: 1, elevation: 1}}>
                    <Toolbar>
                        <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={LastMonth}/>
                            <TouchableWithoutFeedback onPress={() => setMonthSelect(true)}>
                                <Text style={{color: Color.white}}>{moment(ShowDay).format('M月 yyyy')}</Text>
                            </TouchableWithoutFeedback>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={NextMonth}/>
                        </ToolBarView>
                        <ToolBarView>
                            <IconButton icon={'magnify'} iconColor={Color.white} onPress={() => navigation.navigate('Search')}/>
                            <SmailText color={Color.white}>本月總計</SmailText>
                            <Text style={{color: Color.white}}>$ {formatPrice(Total.Total.toFixed(2))}</Text>
                        </ToolBarView>
                        <DateSelect visibility={monthSelect} value={ShowDay} onSelect={setMonth} onDismiss={hideMonthSelect}/>
                    </Toolbar>
                    <Toolbar containerStyle={{zIndex: -1, elevation: -1}}>
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
                </View>

                <TouchableWithoutFeedback onPress={() => setMonthSelect(false)}>
                    <View>
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
                            data={Data} ref={listRef}
                            onRefresh={() => null} refreshing={isRefresh}
                            renderItem={({item}) => <DataPart data={item} rate={setting['Rate']}/>}
                            onScrollToIndexFailed={(info) => {
                                setTimeout(() => {
                                    listRef.current.scrollToIndex({index: info.index});
                                }, 500);
                            }}
                            ListFooterComponent={
                                <View style={{height: 120, justifyContent: 'center', alignItems: 'center'}}>
                                    <SVGCargo height="60" width="180"/>
                                    <Text>已經到底喇~~ （￣︶￣）↗ </Text>
                                </View>}
                            ListEmptyComponent={
                                <View style={{justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                                    <SVGLostCargo height="100" width="300"/>
                                    <Text>沒有資料... Σ(っ °Д °;)っ</Text>
                                </View>
                            }
                        />
                    </View>
                </TouchableWithoutFeedback>
                {/*</React.StrictMode>*/}
            </Portal.Host>
        </SafeAreaView>
    );
};

/* 直接選擇月份 */
const DateSelect = ({visibility = false, onSelect = () => null, value = new Date(), onDismiss = () => null}) => {
    const [date, setDate] = useState(value);
    const {colors} = useTheme();
    const correctMonth = date.getMonth();

    /* 修改預設月份 */
    useEffect(() => setDate(value), [value]);

    /* 選擇顯示年份 */
    const NextYear = () => {
        let tmp = moment(date);
        tmp.add(1, 'y').endOf('month');

        setDate(tmp.toDate());
    };
    const LastYear = () => {
        let tmp = moment(date);
        tmp.subtract(1, 'y').endOf('month');

        setDate(tmp.toDate());
    };

    /* 當前月份 */
    const today = useCallback(() => {
        onDismiss();
        onSelect(new Date());
    }, [onDismiss, onSelect]);

    /* 月份選擇 */
    const setMonth = (month) => {
        let tmp = moment(date);
        tmp.month(month).endOf('month');

        onDismiss();
        onSelect(tmp.toDate());
    };

    return (
        visibility ?
            <ReAnimated.View style={[style.dateSelect, {backgroundColor: colors.background}]} entering={FadeInUp} exiting={FadeOutUp}>
                <View style={[style.row, {height: 45, paddingHorizontal: 10, backgroundColor: '#4596ff'}]}>
                    <Text>選擇日期</Text>
                    <View style={style.row}>
                        <IconButton icon={'calendar-end'} iconColor={colors.text} onPress={today}/>
                        <IconButton icon={'close'} iconColor={colors.text} onPress={onDismiss}/>
                    </View>
                </View>
                <View style={style.row}>
                    <IconButton icon={'chevron-left'} iconColor={colors.text} onPress={LastYear}/>
                    <Text>{moment(date).format('yyyy')}</Text>
                    <IconButton icon={'chevron-right'} iconColor={colors.text} onPress={NextYear}/>
                </View>
                <View style={{flex: 1}}>
                    <View style={[style.row, {flex: 1}]}>
                        <TouchableWithoutFeedback onPress={() => setMonth(0)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 0 ? Color.primaryColor : colors.text}}>1月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(1)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 1 ? Color.primaryColor : colors.text}}>2月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(2)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 2 ? Color.primaryColor : colors.text}}>3月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(3)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 3 ? Color.primaryColor : colors.text}}>4月</Text></View>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={[style.row, {flex: 1}]}>
                        <TouchableWithoutFeedback onPress={() => setMonth(4)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 4 ? Color.primaryColor : colors.text}}>5月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(5)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 5 ? Color.primaryColor : colors.text}}>6月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(6)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 6 ? Color.primaryColor : colors.text}}>7月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(7)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 7 ? Color.primaryColor : colors.text}}>8月</Text></View>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={[style.row, {flex: 1}]}>
                        <TouchableWithoutFeedback onPress={() => setMonth(8)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 8 ? Color.primaryColor : colors.text}}>9月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(9)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 9 ? Color.primaryColor : colors.text}}>10月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(11)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 10 ? Color.primaryColor : colors.text}}>11月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(11)}>
                            <View style={style.dateSelect.button}><Text style={{color: correctMonth === 11 ? Color.primaryColor : colors.text}}>12月</Text></View>
                        </TouchableWithoutFeedback>
                    </View>
                </View>
            </ReAnimated.View> : null
    );
};

/* 內容render */
const DataPart = ({data, rate}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    let date = moment(data.DateTime).locale('zh-hk');
    const navigation = useNavigation();

    /* 判斷週末 */
    let weekColor = Color.darkColorLight; //預設平日
    if(date.format('d') === '0'){
        weekColor = Color.danger; //星期日
    }else if(date.format('d') === '6'){
        weekColor = Color.primaryColor; //星期六
    }

    /* 創意新紀錄以這裏的日期 */
    const press = () => {
        AsyncStorage.setItem('Draft', JSON.stringify({date: date.toISOString()}))
                    .then(() => navigation.navigate('AddRecord'));
    };

    return (
        /* 內容包裝 */
        <View style={[style.dataPart, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]} key={data.DataTime}>
            <Ripple.Default onPress={press}>
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
            </Ripple.Default>

            {/* 備忘錄 */
                data.Mark.length > 0 ?
                    <Ripple.Default>
                        <View style={style.dataPartMark}>
                            {data.Mark.map((item, index) => (
                                <DataPartMark key={index} item={item} id={item.MarkID}/>
                            ))}
                        </View>
                    </Ripple.Default> : null
            }

            {/* 數據內容 */
                data.Record.map((item, index) => (
                    <DataPartBody key={index} item={item} rate={rate} id={item.RecordID} dateTime={data.DateTime}/>
                ))}
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
    const ref = useRef(null);

    /* 向左滑動 */
    const swipeRight = useCallback((progress, dragX) => {
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
    }, []);

    /* 向右滑動 */
    const swipeLeft = useCallback((progress, dragX) => {
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
                if(canHaptic.current === true){
                    ReactNativeHapticFeedback.trigger('effectTick');
                    canHaptic.current = false;
                }
            }else if(value < (120 * -1)){
                if(canHaptic.current === true){
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
    }, []);

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

    /* 移除動畫 */
    const height = useRef(null);

    /* 動畫執行 */
    const hide = useCallback(() => {
        Animated.timing(height.current, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false
        }).start(() => ref.current.close());
    }, []);
    const show = useCallback(() => {
        Animated.timing(height.current, {
            toValue: height.current._startingValue,
            duration: 300,
            useNativeDriver: false
        }).start();
    }, []);

    /* 初始化 */
    const onLayout = useCallback(({nativeEvent}) => {
        if(height.current === null) height.current = new Animated.Value(nativeEvent.layout.height);
    }, []);

    /* 確認動作 */
    const swipeOpen = useCallback((direction) => {
        //編輯
        if(direction === 'left'){
            navigation.navigate('EditRecord', {recordID: id});
            ref.current.close();
        }
        //移除
        if(direction === 'right'){
            DB.transaction(function(tr){
                tr.executeSql('DELETE FROM Record WHERE RecordID = ?', [id]);
            }, function(error){
                console.log('傳輸錯誤: ' + error.message); //debug
            }, () => {
                hide();
                setConfirmMSG(true);
            });
        }
    }, [id]);

    /* 取消刪除 */
    const undo = useCallback(() => {
        DB.transaction(function(tr){
            tr.executeSql(
                'INSERT INTO Record VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, moment(dateTime).format('yyyy-MM-DD'), item.OrderNum, item.Type,
                 item.CargoNum, item.Local, item.RMB, item.HKD, item.Add, item.Shipping, item.Remark]
            );
        }, function(error){
            console.log('傳輸錯誤: ' + error.message); //debug
        }, function(){
            show();
            setConfirmMSG(false);
        });
    }, [dateTime]);

    return (
        <Animated.View style={{height: height.current}} onLayout={onLayout}>
            <Swipeable ref={ref} renderRightActions={swipeRight} onSwipeableOpen={swipeOpen} leftThreshold={120} rightThreshold={120} renderLeftActions={swipeLeft} overshootFriction={8}>
                <Ripple.Default onPress={switchRMBShow}>
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
                                <View style={{overflow: 'hidden', height: 22 * PixelRatio.getFontScale()}}>
                                    <Animated.View style={{flex: 1, transform: [{translateY}]}}>
                                        <Text><SmailText color={Color.textGary}>折算</SmailText>$ {formatPrice((item.RMB / rate).toFixed(2))}</Text>
                                        <Text><SmailText color={Color.textGary}>人民幣</SmailText>$ {formatPrice(item.RMB.toFixed(2))}</Text>
                                    </Animated.View>
                                </View>
                                <Text><SmailText color={Color.textGary}>港幣</SmailText>$ {formatPrice(item.HKD.toFixed(2))}</Text>
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
                </Ripple.Default>
            </Swipeable>
            <Portal>
                <Snackbar
                    visible={confirmMSG} onDismiss={() => setConfirmMSG(false)}
                    action={{
                        label: '復原',
                        onPress: undo
                    }}>
                    已經刪除1個紀錄
                </Snackbar>
            </Portal>
        </Animated.View>
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
    dateSelect: {
        position: 'absolute',
        top: '100%',
        left: 10,
        right: 10,
        borderRadius: 10,
        zIndex: 5,
        elevation: 5,
        height: 280,
        overflow: 'hidden',
        button: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center'
        }
    },
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

export {Home, group_data, DataPart, grouping_note};