import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, SafeAreaView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, useColorScheme, View} from 'react-native';
import SVGCargo from '../module/SVGCargo';
import {Appbar, Caption, IconButton, Paragraph, Surface, Text, Title} from 'react-native-paper';
import SVGLostCargo from '../module/SVGLostCargo';
import {Toolbar, ToolBarView} from '../module/Toolbar';
import {Color} from '../module/Color';
import moment from 'moment';
import {DB} from '../module/SQLite';
import Animated from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {DateSelect} from '../module/DateSelect';

const record = [{
    dateTime: null,
    note: [{
        id: 0,
        title: 'abc',
        content: 'abcde',
        color: Color.red
    }, {
        id: 1,
        title: null,
        content: 'abcde',
        color: Color.blue
    }, {
        id: 2,
        title: 'abc',
        content: null,
        color: Color.cyan
    }]
}, {
    dateTime: new Date(2022, 9, 24),
    note: [{
        id: 3,
        title: 'abc',
        content: null,
        color: null
    }, {
        id: 4,
        title: null,
        content: 'abcde',
        color: Color.purple
    }]
}, {
    dateTime: new Date(2022, 9, 25),
    note: [{
        id: 5,
        title: 'abc',
        content: null,
        color: Color.green
    }, {
        id: 6,
        title: null,
        content: 'abcde',
        color: Color.orange
    }]
}];

/* 備忘錄分組 */
function group_note(ResultSet){
    const package_list = [];

    for(let i = 0 ; i < ResultSet.rows.length ; i++){
        let last_item = package_list[package_list.length - 1];
        const row = ResultSet.rows.item(i);
        const item_date = new Date(row.DateTime);

        //資料
        if(last_item && last_item.dateTime.getDate() === item_date.getDate()){
            //存在 & 相同日期
            last_item.note.push({
                id: row.ID,
                title: row.Title,
                content: row.Contact,
                color: convertColor(row.Color)
            });
        }else{
            //不存在 & 不相同的日期
            package_list.push({
                dateTime: item_date,
                note: [{
                    id: row.ID,
                    title: row.Title,
                    content: row.Contact,
                    color: convertColor(row.Color)
                }]
            });
        }
    }

    return package_list;
}

/* 置頂分組 */
function group_top(package_list = [], ResultSet){
    const topNote = [];

    //資料
    for(let i = 0 ; i < ResultSet.rows.length ; i++){
        const row = ResultSet.rows.item(i);
        topNote.push({
            id: row.ID,
            title: row.Title,
            content: row.Contact,
            color: convertColor(row.Color)
        });
    }

    //加到最前
    package_list.unshift({
        dateTime: null,
        note: topNote
    });

    return package_list;
}

/* 轉換顏色 */
function convertColor(color){
    switch(color){
        case 'red':
            return '#fd766c';
        case 'orange':
            return  '#fdb34d';
        case 'yellow':
            return  '#fdea81';
        case 'green':
            return  '#acfd7b';
        case 'teal':
            return  '#54fdd7';
        case 'cyan':
            return  '#69e7fe';
        case 'blue':
            return  '#4aabfc';
        case 'purple':
            return  '#c17afe';
        case 'pink':
            return  '#fda7de';
        case 'brown':
            return  '#d4b889';
        case 'gray':
            return  '#b9b9ba';
        default:
            return null;
    }
}

const Note = ({navigation, route}) => {
    const [Data, setData] = useState(null); //紀錄資料
    const [ShowDay, setShowDay] = useState(new Date()); //顯示日期
    const [monthSelect, setMonthSelect] = useState(false); //月份選擇是否顯示
    const listRef = useRef(null); //FlatList Ref
    const [isRefresh, setIsRefresh] = useState(false); //是否重新更新

    /* 更新資料 */
    useEffect(() => {
        let package_list;

        /* 讀取備忘錄 */
        DB.transaction(function(tr){
            console.log('顯示: ', moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY'));
            tr.executeSql(
                'SELECT * FROM Note WHERE STRFTIME(\'%m\', `DateTime`) = ? AND STRFTIME(\'%Y\', `DateTime`) = ? AND Top = 0 ORDER BY `DateTime` DESC',
                [moment(ShowDay).format('MM'), moment(ShowDay).format('YYYY')], function(tx, rs){
                    package_list = group_note(rs);
                }
            );
        }, function(error){
            console.log('傳輸錯誤: ' + error.message);
        }, function(){

            /* 讀取置頂 */
            DB.transaction(function(tr){
                console.log('備忘錄顯示: ', moment(ShowDay).format('DD/MM/YYYY'));
                tr.executeSql(
                    'SELECT * FROM Top_Note ORDER BY `DateTime`', [], function(tx, rs){
                        if(rs.rows.length > 0) package_list = group_top(package_list, rs);
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
    }, [ShowDay, DB]);

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
    const setMonth = useCallback((date) => {
        setShowDay(date);
        setIsRefresh(true);
    }, []);

    /* 隱藏直接選擇月份 */
    const hideMonthSelect = useCallback(() => setMonthSelect(false), []);

    /* 自動跳轉顯示月份 */
    useEffect(() => {
        if(route.params){
            setShowDay(new Date(route.params.ShowDay));
        }
    }, [route]);

    /* 自動滑動最新紀錄 */
    useEffect(() => {
        if(Data != null){
            const index = Data.findIndex((item) => item.dateTime != null && item.dateTime.getDate() === ShowDay.getDate());
            if(index > 0){
                listRef.current.scrollToIndex({index: index});
            }
        }
    }, [Data]);

    //debug
    useEffect(() => {
        console.log(Data);
    });

    return (
        <SafeAreaView style={{flex: 1}}>
            <React.StrictMode>
                <View style={{zIndex: 1, elevation: 1}}>
                    <Toolbar>
                        <Appbar.BackAction onPress={navigation.goBack} color={Color.white}/>
                        <Appbar.Content title={'備忘錄'}/>
                        <ToolBarView>
                            <IconButton icon={'chevron-left'} iconColor={Color.white} onPress={LastMonth}/>
                            <TouchableWithoutFeedback onPress={() => setMonthSelect(true)}>
                                <Text style={{color: Color.white}}>{moment(ShowDay).format('M月 yyyy')}</Text>
                            </TouchableWithoutFeedback>
                            <IconButton icon={'chevron-right'} iconColor={Color.white} onPress={NextMonth}/>
                        </ToolBarView>
                        <DateSelect visibility={monthSelect} value={ShowDay} onSelect={setMonth} onDismiss={hideMonthSelect}/>
                    </Toolbar>
                </View>
                {monthSelect ? <TouchableWithoutFeedback onPress={hideMonthSelect}><View style={style.cover}/></TouchableWithoutFeedback>: null}

                <TouchableOpacity style={style.addRecord} activeOpacity={0.8} onPress={() => navigation.navigate('AddNote')}>
                    <View>
                        <MaterialCommunityIcons name={'notebook-plus-outline'} color={Color.white} size={23}/>
                    </View>
                </TouchableOpacity>

                <View style={{paddingTop: 5}}>
                    <FlatList
                        data={Data} ref={listRef} extraData={route}
                        onRefresh={() => null} refreshing={isRefresh}
                        renderItem={({item}) => <NotePart data={item} route={route}/>}
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
            </React.StrictMode>
        </SafeAreaView>
    );
};

/* 備忘錄 */
const NotePart = ({data, route}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;

    const date = moment(data.dateTime).locale('zh-hk');
    console.log(route) //debug

    return (
        <Animated.View style={style.notePart}>
            {data.dateTime != null ? <Caption style={{paddingHorizontal: 10}}>{moment(date).format('D.M (ddd)')}</Caption> : null}
            <View style={style.container}>
                {data.note.map((item, index) => (
                    <Animated.View key={index} style={style.surfaceOut}>
                        <TouchableWithoutFeedback onPress={() => null}>
                            <Surface style={[style.surface, {backgroundColor: item.color ?? BG_color}]}>
                                {item.title != null ? <Title>{item.title}</Title> : null}
                                {item.content != null ? <Paragraph>{item.content}</Paragraph> : null}
                            </Surface>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
};

const style = StyleSheet.create({
    cover: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: -1,
        elevation: -1
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
    notePart: {
        marginVertical: 5
    },
    container: {
        alignItems: 'center'
    },
    surfaceOut: {
        width: '100%',
        paddingHorizontal: 10
    },
    surface: {
        flex: 1,
        padding: 8,
        borderRadius: 10,
        marginBottom: 10
    }
});

export {Note, convertColor};