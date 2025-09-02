import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    StyleSheet,
    ToastAndroid,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {Appbar, Text, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import moment from 'moment';
import TextInput from '../module/TextInput';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import Animated, {SlideInDown, SlideOutDown} from 'react-native-reanimated';
import {convertColor} from './Note';
import {DB} from '../module/SQLite';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const initialState = {
    date: new Date(),
    id: null,
    top: false,
    title: '',
    content: '',
    color: null,
};

/* 顏色列表 */
const colorList = [null, 'red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple', 'pink', 'brown', 'gray'];

/* 更新處理器 */
const reducer = (state, action) => {
    return {...state, ...action};
};

const AddNote = ({navigation, route}) => {
    const {colors} = useTheme();
    const [isRemove, setIsRemove] = useState(false);
    const [state, dispatch] = useReducer(reducer, initialState);
    const [showColorSelector, setShowColorSelector] = useState(false);
    const contentInput = useRef(null);
    const insets = useSafeAreaInsets(); // 取得安全區域的邊距
    const [keyboardVisible, setKeyboardVisible] = useState(false); //鍵盤是否顯示

    /* 開啟顏色選擇 */
    const openColorSelector = useCallback(() => {
        Keyboard.dismiss();
        setTimeout(() => setShowColorSelector(true), 100);
    }, []);

    /* 關閉顏色選擇 */
    const closeColorSelector = useCallback(() => {
        setShowColorSelector(false);
    }, []);

    /* 切換顏色選擇 */
    const toggleColorSelector = useCallback(() => {
        showColorSelector ? closeColorSelector() : openColorSelector();
    }, [showColorSelector, openColorSelector, closeColorSelector]);

    /* 處理退出頁面 儲存 */
    useEffect(() => {
        const save = async () => {
            if ((state.title === '' && state.content === '') || isRemove) return;

            try {
                await DB.transaction(async tr => {
                    if (state.id === null) {
                        //增加備忘錄
                        const [, rs] = await tr.executeSql(
                            'INSERT INTO Note (DateTime, Top, Color, Title, Contact) VALUES (?,?,?,?,?);',
                            [
                                moment(state.date).format('yyyy-MM-DD'),
                                state.top,
                                state.color,
                                state.title === '' ? null : state.title,
                                state.content === '' ? null : state.content,
                            ],
                        );
                        navigation.navigate('Note', {ShowDay: state.date.toString(), id: rs.insertId}); //go back notePage
                    } else {
                        //修改備忘錄
                        await tr.executeSql(
                            'UPDATE Note SET DateTime = ?, Top = ?, Color = ?, Title = ?, Contact = ? WHERE ID = ?',
                            [
                                moment(state.date).format('yyyy-MM-DD'),
                                state.top,
                                state.color,
                                state.title === '' ? null : state.title,
                                state.content === '' ? null : state.content,
                                state.id,
                            ],
                        );
                        navigation.navigate('Note', {ShowDay: state.date.toString(), id: state.id}); //go back notePage
                    }
                });
            } catch (e) {
                console.error('傳輸錯誤: ' + e.message);
                ToastAndroid.show('儲存失敗', ToastAndroid.SHORT);
                return;
            }

            console.log('備忘錄已儲存');
            ToastAndroid.show('備忘錄已儲存', ToastAndroid.SHORT);
        };

        navigation.addListener('beforeRemove', save);
        return () => navigation.removeListener('beforeRemove', save);
    }, [isRemove, navigation, state]);

    /* 讀取備忘錄 */
    useEffect(() => {
        const extracted = async () => {
            try {
                await DB.readTransaction(async tr => {
                    //編輯備忘錄
                    const [, rs] = await tr.executeSql('SELECT * FROM Note WHERE ID = ?', [route.params.id]);

                    const row = rs.rows.item(0);
                    dispatch({
                        date: new Date(row.DateTime),
                        id: row.ID,
                        top: row.Top,
                        title: row.Title,
                        content: row.Contact,
                        color: row.Color,
                    });
                });
            } catch (e) {
                console.error('傳輸錯誤: ', e.message);
                ToastAndroid.show('讀取失敗', ToastAndroid.SHORT);
                return;
            }

            console.log('已取得資料');
        };

        if (route.params) {
            extracted().then();
        }
    }, [route]);

    // 監聽鍵盤顯示隱藏
    useEffect(() => {
        // 虛擬鍵盤顯示狀態
        Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        // 虛擬鍵盤隱藏狀態
        Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

        // 清除事件
        return () => Keyboard.removeAllListeners('keyboardDidShow keyboardDidHide');
    }, []);

    /* 刪除備忘錄 */
    const deleteNote = useCallback(() => {
        const sql = async () => {
            try {
                await DB.transaction(async tr => {
                    await tr.executeSql('DELETE FROM Note WHERE Note.ID = ?', [state.id]);
                });
            } catch (e) {
                console.error('傳輸錯誤: ' + e.message);
                ToastAndroid.show('刪除失敗', ToastAndroid.SHORT);
                return;
            }

            console.log('備忘錄已刪除');
            ToastAndroid.show('備忘錄已刪除', ToastAndroid.SHORT);
            navigation.navigate('Note', {ShowDay: state.date.toString()}); //go back notePage
        };

        setIsRemove(true);
        Alert.alert('刪除', '確認刪除?', [{text: '確認', onPress: sql}, {text: '取消'}], {cancelable: true});
    }, [navigation, state.date, state.id]);

    return (
        <View style={{flex: 1, paddingBottom: insets.bottom}}>
            <Appbar.Header style={{backgroundColor: Color.primaryColor}} statusBarHeight={insets.top} elevated={true}>
                <Appbar.BackAction onPress={navigation.goBack} color={Color.white} />
                <Appbar.Content title={'備忘錄'} />
                <Appbar.Action icon={'palette-outline'} onPress={toggleColorSelector} />
                <Appbar.Action icon={state.top ? 'pin' : 'pin-outline'} onPress={() => dispatch({top: !state.top})} />
                {state.id != null ? <Appbar.Action icon={'delete-outline'} onPress={deleteNote} /> : null}
            </Appbar.Header>
            <View style={{flex: 1}}>
                <KeyboardAvoidingView
                    style={{flex: 1}}
                    behavior={'padding'}
                    keyboardVerticalOffset={insets.top + 64}
                    enabled={keyboardVisible}>
                    <View style={{padding: 20, backgroundColor: convertColor(state.color), flex: 1}}>
                        <Text
                            style={[style.date, {borderColor: colors.text}]}
                            onPress={() => null}
                            onPressOut={() => {
                                DateTimePickerAndroid.open({
                                    value: state.date,
                                    onChange: (event, newDate) => {
                                        dispatch({date: newDate});
                                    },
                                });
                            }}>
                            {moment(state.date).locale('zh-hk').format('D.M (ddd)')}
                        </Text>
                        <TextInput
                            placeholder={'Title'}
                            style={{fontWeight: 'bold'}}
                            value={state.title}
                            onSubmitEditing={() => contentInput.current.focus()}
                            onChangeText={text => dispatch({title: text})}
                            selectionColor={Color.primaryColor}
                            onFocus={closeColorSelector}
                            underlineColor={Color.transparent}
                            activeUnderlineColor={Color.transparent}
                            returnKeyType={'next'}
                        />
                        <TextInput
                            placeholder={'內容'}
                            style={[style.contentInput, {height: undefined}]}
                            value={state.content}
                            onFocus={closeColorSelector}
                            onChangeText={text => dispatch({content: text})}
                            multiline={true}
                            selectionColor={Color.primaryColor}
                            underlineColor={Color.transparent}
                            activeUnderlineColor={Color.transparent}
                            maxLength={200}
                            ref={contentInput}
                        />
                    </View>
                </KeyboardAvoidingView>
            </View>
            {showColorSelector && (
                <Animated.View
                    style={[style.colorSelect, {backgroundColor: colors.background}]}
                    entering={SlideInDown}
                    exiting={SlideOutDown}>
                    {colorList.map((color, index) => (
                        <TouchableWithoutFeedback onPress={() => dispatch({color: color})} key={color}>
                            <View style={style.colorBox}>
                                <View
                                    style={[
                                        style.colorOut,
                                        state.color === color ? {borderColor: Color.primaryColor} : null,
                                    ]}>
                                    <View
                                        style={[
                                            style.color,
                                            color === null
                                                ? {
                                                      borderWidth: 0.7,
                                                      borderColor: Color.darkColorLight,
                                                  }
                                                : {backgroundColor: convertColor(color)},
                                        ]}
                                    />
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    ))}
                </Animated.View>
            )}
        </View>
    );
};

const style = StyleSheet.create({
    contentInput: {
        textAlignVertical: 'top',
        width: '100%',
        flex: 1,
        marginBottom: 10,
    },
    colorBox: {
        width: '25%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorOut: {
        width: 50,
        height: 50,
        borderRadius: 50,
        padding: 5,
        borderWidth: 0.7,
        borderColor: Color.transparent,
    },
    color: {
        flex: 1,
        borderRadius: 50,
    },
    date: {
        borderWidth: 0.7,
        borderRadius: 5,
        padding: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
    },
    colorSelect: {
        flex: 1 / 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignContent: 'stretch',
        flexWrap: 'wrap',
        borderTopWidth: 1,
        borderColor: Color.darkColorLight,
    },
});
export {AddNote};
