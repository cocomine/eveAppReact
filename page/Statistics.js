import React, {useCallback, useState} from 'react';
import {IconButton, Menu, Provider as PaperProvider, Text, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {SafeAreaView, StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import moment from 'moment';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSetting} from '../module/SQLite';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';

/* 顯示模式List */
const showModeList = [
    {label: '全部', value: 0},
    {label: '週', value: 1},
    {label: '月', value: 2},
    {label: '年', value: 3},
    {label: '自訂', value: 4}
];

const Tab = createMaterialTopTabNavigator();

const Statistics = ({route}) => {
    let theme = useTheme();
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: route.color
        }
    };

    const [ShowDay, setShowDay] = useState(moment()); //顯示日期
    const [ShowDayEnd, setShowDayEnd] = useState(moment()); //顯示日期
    const [showMode, setShowMode] = useState(2); //顯示模式, 0 全部, 1 週, 2 月, 3 年, 4 自訂
    const [showModeDropdown, setShowModeDropdown] = useState(false); //顯示模式, 下拉式選單是否開啟
    const [setting] = useSetting(); //設定

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
        <PaperProvider theme={theme}>
            <SafeAreaView style={{flex: 1}}>
                <Toolbar containerStyle={{backgroundColor: route.color}}>

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
                <Tab.Navigator>
                    <Tab.Screen name="TypeStatistics" component={TypeStatistics} options={{title: '尺寸'}}/>
                    <Tab.Screen name="IncomeStatistics" component={IncomeStatistics} options={{title: '收入'}}/>
                </Tab.Navigator>
            </SafeAreaView>
        </PaperProvider>
    );
};

const TypeStatistics = ({navigation, route}) => {

    return (
        <View style={{flex: 1}}>

        </View>
    );
};

const IncomeStatistics = ({navigation, route}) => {
    return (
        <View style={{flex: 1}}>

        </View>
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

export {Statistics};