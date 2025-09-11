import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, StyleSheet, ToastAndroid, TouchableOpacity, TouchableWithoutFeedback, View} from 'react-native';
import {Color} from '../module/Color';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import ADIcon from '@react-native-vector-icons/ant-design';
import {SmailText} from '../module/SmailText';
import moment from 'moment';
import 'moment/min/locales';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Banner, IconButton, Portal, Text} from 'react-native-paper';
import {DB, useSetting} from '../module/SQLite';
import formatPrice from '../module/formatPrice';
import SVGLostCargo from '../module/SVGLostCargo';
import SVGCargo from '../module/SVGCargo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DateSelect} from '../module/DateSelect';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
import {DataPart, groupData, groupingNote} from '../module/DataPart';
/** @typedef {import('@react-navigation/native-stack').NativeStackNavigationProp} NativeStackNavigationProp */
/** @typedef {import('@react-navigation/native').RouteProp} RouteProp */
/** @typedef {import('../module/IRootStackParamList').IRootStackParamList} RootStackParamList */

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
            const [packageItems, total1] = groupData(rs, setting.Rate);
            setTotal(total1);

            console.log('備忘錄顯示:', moment(show_day).format('DD/MM/YYYY'));
            const rs1 = await queryNotes(show_day);
            console.log('已取得資料', rs1.rows.length);
            const data_have_note = rs1.rows.length > 0 ? groupingNote(packageItems, rs1) : packageItems;
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
                <TouchableOpacity
                    style={STYLE.addMark}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('NotePage')}>
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

const STYLE = StyleSheet.create({
    cover: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 1,
        zIndex: 1,
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

export {Home, groupingNote};
