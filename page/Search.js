import React, {useCallback, useEffect, useState} from 'react';
import {DB, useSetting} from '../module/SQLite';
import moment from 'moment/moment';
import {FlatList, SafeAreaView, StatusBar, StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import {Appbar, IconButton, Menu, Text, TextInput} from 'react-native-paper';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import {Color} from '../module/Color';
import formatPrice from '../module/formatPrice';
import SVGCargo from '../module/SVGCargo';
import SVGLostCargo from '../module/SVGLostCargo';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {DataPart, group_data} from './Home';

/* 顯示模式List */
const showModeList = [
    {label: '全部', value: 0},
    {label: '週', value: 1},
    {label: '月', value: 2},
    {label: '年', value: 3},
    {label: '自訂', value: 4}
];

const Search = ({navigation}) => {
    const [Total, setTotal] = useState({Total: 0, RMB: 0, HKD: 0, Add: 0, Shipping: 0}); //總數
    const [Data, setData] = useState(null); //紀錄資料
    const [ShowDay, setShowDay] = useState(moment()); //顯示日期
    const [ShowDayEnd, setShowDayEnd] = useState(moment()); //顯示日期
    const [keyword, setKeyword] = useState(''); //搜尋keyword
    const [showMode, setShowMode] = useState(2); //顯示模式, 0 全部, 1 週, 2 月, 3 年, 4 自訂
    const [showModeDropdown, setShowModeDropdown] = useState(false); //顯示模式, 下拉式選單是否開啟
    const [setting] = useSetting(); //設定

    /* 更新資料 */
    useEffect(() => {
        let sqlQuery = '';
        let sqlValue = [];
        let package_list;

        /* 根據模式安排sql query */
        switch(showMode){
            case 1:
                sqlQuery = 'WHERE STRFTIME(\'%Y-%m-%d\', DateTime) BETWEEN ? AND ?';
                sqlValue = [moment(ShowDay).startOf('week').format('YYYY-MM-DD'), moment(ShowDay).endOf('week').format('YYYY-MM-DD')];
                break;
            case 2:
                sqlQuery = 'WHERE STRFTIME(\'%m\', DateTime) = ? AND STRFTIME(\'%Y\', DateTime) = ?';
                sqlValue = [ShowDay.format('MM'), ShowDay.format('YYYY')];
                break;
            case 3:
                sqlQuery = 'WHERE STRFTIME(\'%Y\', DateTime) = ?';
                sqlValue = [ShowDay.format('YYYY')];
                break;
            case 4:
                sqlQuery = 'WHERE STRFTIME(\'%Y-%m-%d\', DateTime) BETWEEN ? AND ?';
                sqlValue = [moment(ShowDay).format('YYYY-MM-DD'), moment(ShowDayEnd).format('YYYY-MM-DD')];
                break;
            default:
                sqlQuery = 'WHERE true';
                break;
        }
        if(keyword !== ''){
            sqlQuery += ' AND (OrderNum LIKE ? OR Type LIKE ? OR CargoNum LIKE ? OR Local LIKE ?)';
            const tmp = '%' + keyword + '%';
            sqlValue.push(tmp, tmp, tmp, tmp);
        }

        //debug
        // console.log(showMode);
        // console.log(sqlQuery);
        // console.log(sqlValue);

        /* 讀取紀錄 */
        DB.transaction(function(tr){
            console.log('顯示: ', moment(ShowDay).format('DD/MM/YYYY'));
            tr.executeSql(`SELECT *
                           FROM Record ${sqlQuery}
                           ORDER BY DateTime ASC`, sqlValue, function(tx, rs){
                    package_list = group_data(rs, setting['Rate'], (total) => {setTotal(total);});
                }
            );
        }, function(error){
            console.log('傳輸錯誤: ' + error.message);
        }, function(){
            setData(package_list);
            console.log('已取得資料');
        });
    }, [ShowDay, setting, keyword, showMode, ShowDayEnd]);

    /* 選擇顯示月份 */
    const NextMonth = useCallback(() => {
        ShowDay.add(1, 'M').endOf('month');
        setShowDay(moment(ShowDay));
    }, [ShowDay]);
    const LastMonth = useCallback(() => {
        ShowDay.subtract(1, 'M').endOf('month');
        setShowDay(moment(ShowDay));
    }, [ShowDay]);

    /* 選擇顯示週 */
    const NextWeek = useCallback(() => {
        ShowDay.add(1, 'w');
        setShowDay(moment(ShowDay));
    }, [ShowDay]);
    const LastWeek = useCallback(() => {
        ShowDay.subtract(1, 'w');
        setShowDay(moment(ShowDay));
    }, [ShowDay]);

    /* 選擇顯示年 */
    const NextYear = useCallback(() => {
        ShowDay.add(1, 'y');
        setShowDay(moment(ShowDay));
    }, [ShowDay]);
    const LastYear = useCallback(() => {
        ShowDay.subtract(1, 'y');
        setShowDay(moment(ShowDay));
    }, [ShowDay]);

    return (
        /* 頂部toolbar */
        <SafeAreaView style={{flex: 1, position: 'relative'}}>
            <StatusBar backgroundColor={'darkslateblue'} barStyle={'light-content'} animated={true}/>
            {/*<React.StrictMode>*/}
                <View style={{zIndex: 1, elevation: 1}}>
                    <Toolbar containerStyle={{backgroundColor: 'darkslateblue'}}>
                        <Appbar.BackAction onPress={navigation.goBack} color={Color.white}/>

                        {/* 全部 */}
                        {showMode === 0 ? <ToolBarView><Text style={{color: Color.white}}>全部</Text></ToolBarView> : null}

                        {/* 週 */}
                        {showMode === 1 ? <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={LastWeek}/>
                            <Text style={{color: Color.white}}>
                                {moment(ShowDay).startOf('week').format('D.M.YYYY') + ' ~ ' + moment(ShowDay).endOf('week').format('D.M')}</Text>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={NextWeek}/>
                        </ToolBarView> : null}

                        {/* 月份 */}
                        {showMode === 2 ? <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={LastMonth}/>
                            <Text style={{color: Color.white}}>{moment(ShowDay).format('M月 yyyy')}</Text>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={NextMonth}/>
                        </ToolBarView> : null}

                        {/* 年 */}
                        {showMode === 3 ? <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={LastYear}/>
                            <Text style={{color: Color.white}}>{ShowDay.format('YYYY')}</Text>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={NextYear}/>
                        </ToolBarView> : null}

                        {/* 自訂 */}
                        {showMode === 4 ? <ToolBarView>
                            <TouchableWithoutFeedback onPress={() => {
                                DateTimePickerAndroid.open({
                                    value: ShowDay.toDate(), onChange: (event, newDate) => {
                                        setShowDay(moment(newDate));
                                    }
                                });
                            }}>
                                <View style={style.row}>
                                    <Text style={{color: Color.white}}>{ShowDay.format('YYYY-MM-DD')}</Text>
                                    <MaterialCommunityIcons name={'calendar-month-outline'} size={20}/>
                                </View>
                            </TouchableWithoutFeedback>
                            <Text style={{color: Color.white, paddingHorizontal: 10}}>~</Text>
                            <TouchableWithoutFeedback onPress={() => {
                                DateTimePickerAndroid.open({
                                    value: ShowDayEnd.toDate(), onChange: (event, newDate) => {
                                        setShowDayEnd(moment(newDate));
                                    },
                                    minimumDate: ShowDay.toDate()
                                });
                            }}>
                                <View style={style.row}>
                                    <Text style={{color: Color.white}}>{ShowDayEnd.format('YYYY-MM-DD')}</Text>
                                    <MaterialCommunityIcons name={'calendar-month-outline'} size={20}/>
                                </View>
                            </TouchableWithoutFeedback>
                        </ToolBarView> : null}

                        <ToolBarView style={{position: 'relative'}}>
                            <Menu
                                visible={showModeDropdown}
                                onDismiss={() => setShowModeDropdown(false)}
                                anchor={
                                    <Text onPress={() => setShowModeDropdown(true)} style={style.dropdown}>
                                        {showModeList.find((item => item.value === showMode)).label}
                                        <MaterialCommunityIcons name={'chevron-down'} size={10}/>
                                    </Text>}>
                                {showModeList.map((item, index) =>
                                    <Menu.Item onPress={() => setShowMode(item.value)} title={item.label}/>
                                )}
                            </Menu>
                        </ToolBarView>
                    </Toolbar>
                    <Toolbar containerStyle={{backgroundColor: 'darkslateblue'}}>
                        <View style={{flex: 1}}>
                            <TextInput value={keyword} onChangeText={setKeyword} left={
                                <TextInput.Icon name="magnify"/>} dense={true} style={{borderRadius: 4}} underlineColor={Color.transparent}/>
                        </View>
                    </Toolbar>
                    <Toolbar containerStyle={{backgroundColor: 'darkslateblue'}}>
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

                {/* 內容 */}
                <FlatList
                    data={Data}
                    renderItem={({item}) => <DataPart data={item} rate={setting['Rate']}/>}
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
            {/*</React.StrictMode>*/}
        </SafeAreaView>
    );
};

const style = StyleSheet.create({
    dropdown: {
        color: Color.white,
        borderWidth: .7,
        borderColor: Color.white,
        borderRadius: 10,
        padding: 10,
        paddingVertical: 5
    },
    row: {
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row'
    }
});
export {Search};