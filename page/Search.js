import React, {useCallback, useEffect, useState} from 'react';
import {DB, useSetting} from '../module/SQLite';
import moment from 'moment/moment';
import {FlatList, StyleSheet, ToastAndroid, TouchableWithoutFeedback, View} from 'react-native';
import {IconButton, Menu, Text, TextInput} from 'react-native-paper';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import {Color} from '../module/Color';
import formatPrice from '../module/formatPrice';
import SVGCargo from '../module/SVGCargo';
import SVGLostCargo from '../module/SVGLostCargo';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {DataPart, groupData} from '../module/DataPart';

// 顯示模式List
const SHOW_MODE_LIST = [
    {label: '全部', value: 0},
    {label: '週', value: 1},
    {label: '月', value: 2},
    {label: '年', value: 3},
    {label: '自訂', value: 4},
];

const Search = () => {
    const [total, setTotal] = useState({Total: 0, RMB: 0, HKD: 0, Add: 0, Shipping: 0}); //總數
    const [data, setData] = useState(null); //紀錄資料
    const [show_day, setShowDay] = useState(moment()); //顯示日期
    const [show_day_end, setShowDayEnd] = useState(moment()); //顯示日期
    const [keyword, setKeyword] = useState(''); //搜尋keyword
    const [show_mode, setShowMode] = useState(2); //顯示模式, 0 全部, 1 週, 2 月, 3 年, 4 自訂
    const [show_mode_dropdown, setShowModeDropdown] = useState(false); //顯示模式, 下拉式選單是否開啟
    const [setting, settingForceRefresh] = useSetting(); //設定
    const insets = useSafeAreaInsets(); //安全區域
    /** @type {RouteProp<RootStackParamList, 'Main'>} **/
    const route = useRoute(); //路由

    // 更新資料
    useEffect(() => {
        let sql_query = '';
        let sql_value = [];

        // 根據模式安排sql query
        switch (show_mode) {
            case 1:
                sql_query = "WHERE STRFTIME('%Y-%m-%d', DateTime) BETWEEN ? AND ?";
                sql_value = [
                    moment(show_day).startOf('week').format('YYYY-MM-DD'),
                    moment(show_day).endOf('week').format('YYYY-MM-DD'),
                ];
                break;
            case 2:
                sql_query = "WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ?";
                sql_value = [show_day.format('MM'), show_day.format('YYYY')];
                break;
            case 3:
                sql_query = "WHERE STRFTIME('%Y', DateTime) = ?";
                sql_value = [show_day.format('YYYY')];
                break;
            case 4:
                sql_query = "WHERE STRFTIME('%Y-%m-%d', DateTime) BETWEEN ? AND ?";
                sql_value = [moment(show_day).format('YYYY-MM-DD'), moment(show_day_end).format('YYYY-MM-DD')];
                break;
            default:
                sql_query = 'WHERE true';
                break;
        }
        if (keyword !== '') {
            sql_query += ' AND (OrderNum LIKE ? OR Type LIKE ? OR CargoNum LIKE ? OR Local LIKE ?)';
            const tmp = '%' + keyword + '%';
            sql_value.push(tmp, tmp, tmp, tmp);
        }

        // 讀取紀錄
        const extracted = async () => {
            try {
                await DB.readTransaction(async tr => {
                    console.log('顯示: ', moment(show_day).format('DD/MM/YYYY'));
                    const [, rs] = await tr.executeSql(
                        `SELECT *
                         FROM Record ${sql_query}
                         ORDER BY DateTime DESC`,
                        sql_value,
                    );

                    const [package_list, total1] = groupData(rs, setting.Rate);
                    setTotal(total1);
                    setData(package_list);
                });
            } catch (e) {
                console.error('傳輸錯誤: ' + e.message);
                ToastAndroid.show('傳輸錯誤', ToastAndroid.LONG);
                return;
            }

            console.log('已取得資料');
        };

        extracted().then();
    }, [show_day, setting, keyword, show_mode, show_day_end]);

    // 重新整理資料
    useEffect(() => {
        if (route.params && route.params.settingForceRefreshAlert) {
            console.log('重新整理資料');
            settingForceRefresh();
        }
    }, [route.params, settingForceRefresh]);

    // 選擇顯示月份
    const nextMonth = useCallback(() => {
        show_day.add(1, 'M').endOf('month');
        setShowDay(moment(show_day));
    }, [show_day]);
    const lastMonth = useCallback(() => {
        show_day.subtract(1, 'M').endOf('month');
        setShowDay(moment(show_day));
    }, [show_day]);

    // 選擇顯示週
    const nextWeek = useCallback(() => {
        show_day.add(1, 'w');
        setShowDay(moment(show_day));
    }, [show_day]);
    const lastWeek = useCallback(() => {
        show_day.subtract(1, 'w');
        setShowDay(moment(show_day));
    }, [show_day]);

    // 選擇顯示年
    const nextYear = useCallback(() => {
        show_day.add(1, 'y');
        setShowDay(moment(show_day));
    }, [show_day]);
    const lastYear = useCallback(() => {
        show_day.subtract(1, 'y');
        setShowDay(moment(show_day));
    }, [show_day]);

    return (
        // 頂部toolbar
        <View style={{flex: 1}}>
            <View style={{zIndex: 1, elevation: 1}}>
                <Toolbar
                    containerStyle={{
                        backgroundColor: 'darkslateblue',
                        paddingTop: insets.top,
                        height: 50 + insets.top,
                    }}>
                    {/*<Appbar.BackAction onPress={navigation.goBack} color={Color.white} />*/}

                    {/* 全部 */}
                    {show_mode === 0 ? (
                        <ToolBarView style={{paddingLeft: 20}}>
                            <Text style={{color: Color.white}}>全部</Text>
                        </ToolBarView>
                    ) : null}

                    {/* 週 */}
                    {show_mode === 1 ? (
                        <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={lastWeek} />
                            <Text style={{color: Color.white}}>
                                {moment(show_day).startOf('week').format('D.M.YYYY') +
                                    ' ~ ' +
                                    moment(show_day).endOf('week').format('D.M')}
                            </Text>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={nextWeek} />
                        </ToolBarView>
                    ) : null}

                    {/* 月份 */}
                    {show_mode === 2 ? (
                        <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={lastMonth} />
                            <Text style={{color: Color.white}}>{moment(show_day).format('M月 yyyy')}</Text>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={nextMonth} />
                        </ToolBarView>
                    ) : null}

                    {/* 年 */}
                    {show_mode === 3 ? (
                        <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={lastYear} />
                            <Text style={{color: Color.white}}>{show_day.format('YYYY')}</Text>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={nextYear} />
                        </ToolBarView>
                    ) : null}

                    {/* 自訂 */}
                    {show_mode === 4 ? (
                        <ToolBarView style={{paddingLeft: 20}}>
                            <TouchableWithoutFeedback
                                onPress={() => {
                                    DateTimePickerAndroid.open({
                                        value: show_day.toDate(),
                                        onChange: (event, newDate) => {
                                            setShowDay(moment(newDate));
                                        },
                                    });
                                }}>
                                <View style={STYLE.row}>
                                    <Text style={{color: Color.white, marginEnd: 5}}>
                                        {show_day.format('YYYY-MM-DD')}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={'calendar-month-outline'}
                                        size={20}
                                        color={Color.white}
                                    />
                                </View>
                            </TouchableWithoutFeedback>
                            <Text style={{color: Color.white, paddingHorizontal: 10}}>~</Text>
                            <TouchableWithoutFeedback
                                onPress={() => {
                                    DateTimePickerAndroid.open({
                                        value: show_day_end.toDate(),
                                        onChange: (event, newDate) => {
                                            setShowDayEnd(moment(newDate));
                                        },
                                        minimumDate: show_day.toDate(),
                                    });
                                }}>
                                <View style={STYLE.row}>
                                    <Text
                                        style={{
                                            color: Color.white,
                                            marginEnd: 5,
                                        }}>
                                        {show_day_end.format('YYYY-MM-DD')}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={'calendar-month-outline'}
                                        size={20}
                                        color={Color.white}
                                    />
                                </View>
                            </TouchableWithoutFeedback>
                        </ToolBarView>
                    ) : null}

                    <ToolBarView style={{position: 'relative'}}>
                        <Menu
                            visible={show_mode_dropdown}
                            onDismiss={() => setShowModeDropdown(false)}
                            anchor={
                                <Text onPress={() => setShowModeDropdown(true)} style={STYLE.dropdown}>
                                    {SHOW_MODE_LIST.find(item => item.value === show_mode).label}
                                    <MaterialCommunityIcons name={'chevron-down'} size={10} />
                                </Text>
                            }>
                            {SHOW_MODE_LIST.map((item, index) => (
                                <Menu.Item onPress={() => setShowMode(item.value)} title={item.label} key={index} />
                            ))}
                        </Menu>
                    </ToolBarView>
                </Toolbar>
                <Toolbar containerStyle={{backgroundColor: 'darkslateblue'}}>
                    <View style={{flex: 1, paddingLeft: 5}}>
                        <TextInput
                            value={keyword}
                            onChangeText={setKeyword}
                            left={<TextInput.Icon icon={'magnify'} />}
                            dense={true}
                            style={{borderRadius: 4}}
                            underlineColor={Color.transparent}
                        />
                    </View>
                </Toolbar>
                <Toolbar containerStyle={{backgroundColor: 'darkslateblue'}}>
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
                            {'加收\n¥ ' + formatPrice(total.Add.toFixed(2))}
                        </Text>
                    </View>
                    <View style={{flex: 1}}>
                        <Text
                            style={{
                                color: Color.white,
                                fontSize: 12,
                                textAlign: 'center',
                            }}>
                            {'運費\n¥ ' + formatPrice(total.Shipping.toFixed(2))}
                        </Text>
                    </View>
                </Toolbar>
            </View>

            {/* 內容 */}
            <FlatList
                data={data}
                renderItem={({item}) => <DataPart data={item} rate={setting.Rate} />}
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
    );
};

const STYLE = StyleSheet.create({
    dropdown: {
        color: Color.white,
        borderWidth: 0.7,
        borderColor: Color.white,
        borderRadius: 10,
        padding: 10,
        paddingVertical: 5,
    },
    row: {
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
    },
});
export {Search};
