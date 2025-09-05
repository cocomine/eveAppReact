import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    FlatList,
    StyleSheet,
    ToastAndroid,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View,
} from 'react-native';
import SVGCargo from '../module/SVGCargo';
import {Appbar, Caption, IconButton, Paragraph, Surface, Text, Title} from 'react-native-paper';
import SVGLostCargo from '../module/SVGLostCargo';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import {Color} from '../module/Color';
import moment from 'moment';
import {DB} from '../module/SQLite';
import Animated, {useAnimatedStyle, useSharedValue, withSequence, withTiming} from 'react-native-reanimated';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import {DateSelect} from '../module/DateSelect';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
/** @typedef {import('@react-navigation/native-stack').NativeStackNavigationProp} NativeStackNavigationProp */
/** @typedef {import('@react-navigation/native').RouteProp} RouteProp */
/** @typedef {import('../module/RootStackParamList').RootStackParamList} RootStackParamList */

/* 備忘錄分組 */
function group_note(ResultSet) {
    const package_list = [];

    for (let i = 0; i < ResultSet.rows.length; i++) {
        let last_item = package_list[package_list.length - 1];
        const row = ResultSet.rows.item(i);
        const item_date = new Date(row.DateTime);

        //資料
        if (last_item && last_item.dateTime.getDate() === item_date.getDate()) {
            //存在 & 相同日期
            last_item.note.push({
                id: row.ID,
                title: row.Title,
                content: row.Contact,
                color: convertColor(row.Color),
            });
        } else {
            //不存在 & 不相同的日期
            package_list.push({
                dateTime: item_date,
                note: [
                    {
                        id: row.ID,
                        title: row.Title,
                        content: row.Contact,
                        color: convertColor(row.Color),
                    },
                ],
            });
        }
    }

    return package_list;
}

/* 置頂分組 */
function group_top(package_list = [], ResultSet) {
    const topNote = [];

    //資料
    for (let i = 0; i < ResultSet.rows.length; i++) {
        const row = ResultSet.rows.item(i);
        topNote.push({
            id: row.ID,
            title: row.Title,
            content: row.Contact,
            color: convertColor(row.Color),
        });
    }

    //加到最前
    package_list.unshift({
        dateTime: null,
        note: topNote,
    });

    return package_list;
}

/* 轉換顏色 */
function convertColor(color) {
    switch (color) {
        case 'red':
            return '#c9837e';
        case 'orange':
            return '#d3a25e';
        case 'yellow':
            return '#bdb060';
        case 'green':
            return '#87bf65';
        case 'teal':
            return '#6fbdad';
        case 'cyan':
            return '#50b6c6';
        case 'blue':
            return '#3b8dd0';
        case 'purple':
            return '#946db5';
        case 'pink':
            return '#d188b7';
        case 'brown':
            return '#b38e52';
        case 'gray':
            return '#89898e';
        default:
            return null;
    }
}

/**
 * 備忘錄
 * @type {React.FC<{navigation: NativeStackNavigationProp<RootStackParamList, 'NotePage'>;
 *         route: RouteProp<RootStackParamList, 'NotePage'>}>}
 */
const Note = ({navigation, route}) => {
    const [Data, setData] = useState(null); //紀錄資料
    const [ShowDay, setShowDay] = useState(new Date()); //顯示日期
    const [monthSelect, setMonthSelect] = useState(false); //月份選擇是否顯示
    const listRef = useRef(null); //FlatList Ref
    const [isRefresh, setIsRefresh] = useState(false); //是否重新更新
    const insets = useSafeAreaInsets(); //安全區域

    /* 更新資料 */
    useEffect(() => {
        let package_list;

        /* 讀取備忘錄 */
        const extracted = async () => {
            try {
                await DB.readTransaction(async tr => {
                    console.log('顯示: ', moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY'));
                    const [, rs] = await tr.executeSql(
                        "SELECT * FROM Note WHERE STRFTIME('%m', `DateTime`) = ? AND STRFTIME('%Y', `DateTime`) = ? AND Top = 0 ORDER BY `DateTime` DESC",
                        [moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY')],
                    );

                    package_list = group_note(rs);
                });
            } catch (e) {
                console.error('傳輸錯誤: ', e.message);
                ToastAndroid.show('讀取資料失敗', ToastAndroid.SHORT);
                return;
            }

            //讀取置頂
            try {
                await DB.readTransaction(async tr => {
                    console.log('備忘錄顯示: ', moment(ShowDay).format('DD/MM/YYYY'));
                    const [, rs] = await tr.executeSql('SELECT * FROM Top_Note ORDER BY `DateTime`', []);

                    if (rs.rows.length > 0) package_list = group_top(package_list, rs);
                });
            } catch (e) {
                console.error('傳輸錯誤: ', e.message);
                ToastAndroid.show('讀取資料失敗', ToastAndroid.SHORT);
                return;
            }

            console.log('已取得資料');
            setData(package_list);
            setIsRefresh(false);
        };

        extracted().then();
    }, [ShowDay]);

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

    /* 直接選擇月份 */
    const setMonth = useCallback(date => {
        setShowDay(date);
        setIsRefresh(true);
    }, []);

    /* 隱藏直接選擇月份 */
    const hideMonthSelect = useCallback(() => setMonthSelect(false), []);

    /* 自動跳轉顯示月份 */
    useEffect(() => {
        if (route.params && route.params.showDay) {
            setShowDay(new Date(route.params.showDay));
        }
    }, [route.params]);

    /* 自動滑動最新紀錄 */
    useEffect(() => {
        if (Data != null) {
            const index = Data.findIndex(
                item => item.dateTime != null && item.dateTime.getDate() === ShowDay.getDate(),
            );
            if (index > 0) {
                listRef.current.scrollToIndex({index: index});
            }
        }
    }, [Data, ShowDay]);

    return (
        <View style={{flex: 1}}>
            <View style={{zIndex: 2, elevation: 2}}>
                <Toolbar containerStyle={{paddingTop: insets.top}}>
                    <Appbar.BackAction onPress={navigation.goBack} color={Color.white} />
                    <Appbar.Content title={'備忘錄'} />
                    <ToolBarView>
                        <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={LastMonth} />
                        <TouchableWithoutFeedback onPress={() => setMonthSelect(true)}>
                            <Text style={{color: Color.white}}>{moment(ShowDay).format('M月 yyyy')}</Text>
                        </TouchableWithoutFeedback>
                        <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={NextMonth} />
                    </ToolBarView>
                    <DateSelect
                        visibility={monthSelect}
                        value={ShowDay}
                        onSelect={setMonth}
                        onDismiss={hideMonthSelect}
                    />
                </Toolbar>
            </View>
            {monthSelect && (
                <TouchableWithoutFeedback onPress={hideMonthSelect}>
                    <View style={[style.cover]} />
                </TouchableWithoutFeedback>
            )}

            <TouchableOpacity
                style={[style.addRecord, {bottom: 20 + insets.bottom}]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('AddNote')}>
                <View>
                    <MaterialCommunityIcons name={'notebook-plus-outline'} color={Color.white} size={23} />
                </View>
            </TouchableOpacity>

            <View style={{paddingTop: 5, flex: 1}}>
                <FlatList
                    data={Data}
                    ref={listRef}
                    onRefresh={() => null}
                    refreshing={isRefresh}
                    renderItem={({item}) => <NotePart data={item} />}
                    onScrollToIndexFailed={info => {
                        setTimeout(() => {
                            listRef.current.scrollToIndex({index: info.index});
                        }, 500);
                    }}
                    ListFooterComponent={
                        <View
                            style={{
                                height: 120,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: insets.bottom,
                            }}>
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
        </View>
    );
};

/* 備忘錄卡片 */
const NoteBody = ({item}) => {
    /** @type {NativeStackNavigationProp<RootStackParamList, 'NotePage'>} */
    const navigation = useNavigation();
    /** @type {RouteProp<RootStackParamList, 'NotePage'>} */
    const route = useRoute();
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;

    const bg = useSharedValue('rgba(18,125,255,0)');
    const animatedStyles = useAnimatedStyle(() => {
        return {
            backgroundColor: bg.value,
        };
    });

    /* 播放動畫 */
    useEffect(() => {
        let id;
        if (route.params && route.params.id && route.params.id === item.id) {
            id = setTimeout(() => {
                bg.value = withSequence(
                    withTiming('rgba(18,125,255,0.6)'),
                    withTiming('rgba(18,125,255,0.3)'),
                    withTiming('rgba(18,125,255,0.6)'),
                    withTiming('rgba(18,125,255,0)'),
                );
            }, 300);
        }

        return () => clearTimeout(id); //清除計時器
    }, [bg, item.id, route.params]);

    return (
        <Animated.View style={[style.surfaceOut, animatedStyles]}>
            <TouchableWithoutFeedback onPress={() => navigation.navigate('AddNote', {id: item.id})}>
                <Surface style={[style.surface, {backgroundColor: item.color ?? BG_color}]}>
                    {item.title != null ? <Title>{item.title}</Title> : null}
                    {item.content != null ? <Paragraph>{item.content}</Paragraph> : null}
                </Surface>
            </TouchableWithoutFeedback>
        </Animated.View>
    );
};

/* 備忘錄 */
const NotePart = ({data}) => {
    const date = moment(data.dateTime).locale('zh-hk');

    return (
        <View style={[style.notePart]}>
            <Caption style={{paddingHorizontal: 10}}>
                {data.dateTime != null ? moment(date).format('D.M (ddd)') : '置頂'}
            </Caption>
            <View style={style.container}>
                {data.note.map((item, index) => (
                    <NoteBody item={item} key={index} />
                ))}
            </View>
        </View>
    );
};

const style = StyleSheet.create({
    cover: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        elevation: 1,
    },
    addRecord: {
        backgroundColor: Color.primaryColor,
        position: 'absolute',
        bottom: 40,
        right: 20,
        width: 57,
        height: 57,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        zIndex: 5,
    },
    notePart: {
        marginVertical: 5,
    },
    container: {
        alignItems: 'center',
    },
    surfaceOut: {
        width: '100%',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    surface: {
        flex: 1,
        padding: 8,
        borderRadius: 10,
    },
});

export {Note, convertColor};
