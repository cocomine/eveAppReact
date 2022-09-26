import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {Alert, KeyboardAvoidingView, SafeAreaView, StyleSheet, ToastAndroid, TouchableWithoutFeedback, View} from 'react-native';
import {Appbar, Text, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import moment from 'moment';
import TextInput from '../module/TextInput';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import Animated, {SlideInDown, SlideOutDown} from 'react-native-reanimated';
import {convertColor} from './Note';
import {DB} from '../module/SQLite';
import {hideKeyboard} from 'react-native-hide-keyboard/src';

const initialState = {
    date: new Date(),
    id: null,
    top: false,
    title: '',
    content: '',
    color: null
};

/* 顏色列表 */
const colorList = [null, 'red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple', 'pink', 'brown', 'gray'];

/* 更新處理器 */
const reducer = (state, action) => {
    return {...state, ...action};
};

const AddNote = ({navigation, route}) => {
    const {colors} = useTheme();

    const [state, dispatch] = useReducer(reducer, initialState);
    const [showColorSelector, setShowColorSelector] = useState(false);
    const contentInput = useRef(null);

    //debug
    // useEffect(() => {
    //     console.log(state);
    //     console.log(route);
    // });

    /* 開啟顏色選擇 */
    const openColorSelector = useCallback(() => {
        hideKeyboard().finally(() => setShowColorSelector(true));
    }, []);

    /* 關閉顏色選擇 */
    const closeColorSelector = useCallback(() => {
        setShowColorSelector(false);
    }, []);

    /* 處理退出頁面 儲存 */
    useEffect(() => {
        return navigation.addListener('beforeRemove', (e) => { //清除活動監聽器
            if(state.title !== '' || state.content !== ''){
                DB.transaction(function(tr){
                    if(state.id === null){
                        //增加備忘錄
                        tr.executeSql('INSERT INTO Note (DateTime, Top, Color, Title, Contact) VALUES (?,?,?,?,?);',
                            [moment(state.date).format('yyyy-MM-DD'), state.top, state.color, state.title === '' ? null : state.title,
                             state.content === '' ? null : state.content], function(tr, rs){
                                navigation.navigate('Note', {ShowDay: state.date.toString(), id: rs.insertId}); //go back notePage
                            }
                        );
                    }else{
                        //修改備忘錄
                        tr.executeSql('UPDATE Note SET DateTime = ?, Top = ?, Color = ?, Title = ?, Contact = ? WHERE ID = ?',
                            [moment(state.date).format('yyyy-MM-DD'), state.top, state.color, state.title === '' ? null : state.title,
                             state.content === '' ? null : state.content, state.id], function(tr, rs){
                                navigation.navigate('Note', {ShowDay: state.date.toString(), id: state.id}); //go back notePage
                            }
                        );
                    }
                }, function(e){
                    console.log('傳輸錯誤: ' + e.message);
                }, function(){
                    ToastAndroid.show('備忘錄已儲存', ToastAndroid.SHORT);
                });
            }
        });
    }, [navigation, state]);

    /* 讀取備忘錄 */
    useEffect(() => {
        if(route.params){
            DB.transaction(function(tr){
                //編輯備忘錄
                tr.executeSql('SELECT * FROM Note WHERE ID = ?', [route.params.id], function(rx, rs){
                    const row = rs.rows.item(0);
                    dispatch({
                        date: new Date(row.DateTime),
                        id: row.ID,
                        top: row.Top,
                        title: row.Title,
                        content: row.Contact,
                        color: row.Color
                    });
                });
            }, function(error){
                console.log('傳輸錯誤: ' + error.message);
            }, function(){
                console.log('已取得資料');
            });
        }
    }, [route]);

    /* 刪除備忘錄 */
    const deleteNote = useCallback(() => {
        const sql = () => {
            DB.transaction(function(tr){
                tr.executeSql('DELETE FROM Note WHERE Note.ID = ?', [state.id]);
            }, function(error){
                console.log('傳輸錯誤: ' + error.message);
            }, function(){
                ToastAndroid.show('備忘錄已刪除', ToastAndroid.SHORT);
                navigation.goBack();
            });
        };

        Alert.alert('刪除', '確認刪除?', [{text: '確認', onPress: sql}, {text: '取消'}], {cancelable: true});
    }, [state]);

    return (
        <SafeAreaView style={{flex: 1}}>
            {/*<React.StrictMode>*/}
                <View style={{flex: 1}}>
                    <Appbar style={{backgroundColor: Color.primaryColor}}>
                        <Appbar.BackAction onPress={navigation.goBack} color={Color.white}/>
                        <Appbar.Content title={'備忘錄'}/>
                        <Appbar.Action icon={'palette-outline'} onPress={openColorSelector}/>
                        <Appbar.Action icon={state.top ? 'pin' : 'pin-outline'} onPress={() => dispatch({top: !state.top})}/>
                        {state.id != null ? <Appbar.Action icon={'delete-outline'} onPress={deleteNote}/> : null}
                    </Appbar>
                    <KeyboardAvoidingView style={{padding: 20, backgroundColor: convertColor(state.color), flex: 1}} behavior={'height'}>
                        <Text style={[style.date, {borderColor: colors.text}]} onPress={() => null} onPressOut={() => {
                            DateTimePickerAndroid.open({
                                value: state.date, onChange: (event, newDate) => {
                                    dispatch({date: newDate});
                                }
                            });
                        }}>{moment(state.date).locale('zh-hk').format('D.M (ddd)')}</Text>
                        <TextInput placeholder={'Title'} style={{fontWeight: 'bold'}} value={state.title} onSubmitEditing={() => contentInput.current.focus()}
                                   onChangeText={(text) => dispatch({title: text})} selectionColor={Color.primaryColor} onFocus={closeColorSelector}
                                   underlineColor={Color.transparent} activeUnderlineColor={Color.transparent} returnKeyType={'next'}/>
                        <TextInput placeholder={'內容'} style={[style.contentInput,
                            {height: undefined}]} value={state.content} onFocus={closeColorSelector}
                                   onChangeText={(text) => dispatch({content: text})} multiline={true} selectionColor={Color.primaryColor}
                                   underlineColor={Color.transparent} activeUnderlineColor={Color.transparent} maxLength={200} ref={contentInput}/>
                    </KeyboardAvoidingView>
                </View>
                {showColorSelector ?
                    <TouchableWithoutFeedback onPress={() => setShowColorSelector(false)}>
                        <View style={style.colorSelectOut}>
                            <Animated.View style={[style.colorSelect,
                                {backgroundColor: colors.background}]} entering={SlideInDown} exiting={SlideOutDown}>
                                {colorList.map((color, index) =>
                                    <TouchableWithoutFeedback onPress={() => dispatch({color: color})}>
                                        <View style={style.colorBox}>
                                            <View style={[style.colorOut, state.color === color ? {borderColor: Color.primaryColor} : null]}>
                                                <View style={[style.color,
                                                              color === null ? {
                                                                  borderWidth: .7,
                                                                  borderColor: Color.darkColorLight
                                                              } : {backgroundColor: convertColor(color)}
                                                ]}/>
                                            </View>
                                        </View>
                                    </TouchableWithoutFeedback>
                                )}
                            </Animated.View>
                        </View>
                    </TouchableWithoutFeedback>
                    : null}
            {/*</React.StrictMode>*/}
        </SafeAreaView>
    );
};

const style = StyleSheet.create({
    contentInput: {
        textAlignVertical: 'top',
        width: '100%',
        flex: 1,
        marginBottom: 10
    },
    colorBox: {
        width: '25%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    colorOut: {
        width: 50,
        height: 50,
        borderRadius: 50,
        padding: 5,
        borderWidth: .7,
        borderColor: Color.transparent
    },
    color: {
        flex: 1,
        borderRadius: 50
    },
    date: {
        borderWidth: .7,
        borderRadius: 5,
        padding: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start'
    },
    colorSelectOut: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        justifyContent: 'flex-end'
    },
    colorSelect: {
        flex: 1 / 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignContent: 'stretch',
        flexWrap: 'wrap'
    }
});
export {AddNote};