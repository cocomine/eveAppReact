import React, {forwardRef, useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {
    Animated,
    BackHandler,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    ScrollView,
    StyleSheet,
    ToastAndroid,
    TouchableWithoutFeedback,
    useColorScheme,
    useWindowDimensions,
    View,
} from 'react-native';
import moment from 'moment';
import {Color} from '../module/Color';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {DecimalInput} from '../module/NumInput';
import {NumKeyboard} from '../module/NumKeyboard';
import TextInput from '../module/TextInput';
import {ActivityIndicator, Button, HelperText, IconButton as PaperIconButton, Menu, Text} from 'react-native-paper';
import TextInputMask from 'react-native-text-input-mask';
import {RadioButton, RadioGroup} from '../module/RadioButton';
import {DB, useSetting} from '../module/SQLite';
import ErrorHelperText from '../module/ErrorHelperText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import REAnimated, {LinearTransition, StretchInX} from 'react-native-reanimated';
import ImageViewer from 'react-native-image-zoom-viewer';
import {useHeaderHeight} from '@react-navigation/elements';
/** @typedef {import('@react-navigation/native-stack').NativeStackNavigationProp} NativeStackNavigationProp */
/** @typedef {import('@react-navigation/native').RouteProp} RouteProp */
/** @typedef {import('../module/IRootStackParamList').IRootStackParamList} RootStackParamList */

const IconButton = REAnimated.createAnimatedComponent(PaperIconButton);

const RECORD_INITIAL_STATE = {
    date: new Date(),
    order_id: '',
    type: '40',
    cargo_letter: '',
    cargo_num: '',
    cargo_check_num: '',
    location: '',
    rmb: 0,
    hkd: 0,
    add: 0,
    shipping: 0,
    remark: '',
    image: [],
    error: {
        cargo: null,
        location: null,
        order_id: null,
    },
};
//更新類型
const [
    UPDATE_DATE,
    UPDATE_ORDER_ID,
    UPDATE_TYPE,
    UPDATE_CARGO_LETTER,
    UPDATE_CARGO_NUM,
    UPDATE_CARGO_CHECK_NUM,
    UPDATE_LOCATION,
    UPDATE_RMB,
    UPDATE_HKD,
    UPDATE_ADD,
    UPDATE_SHIPPING,
    UPDATE_REMARK,
    SET_ERROR,
    UPDATE_IMAGE,
] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/* 更新處理器 */
const reducer = (state, action) => {
    switch (action.type) {
        case UPDATE_DATE:
            return {
                ...state,
                date: action.payload.date,
            };
        case UPDATE_ORDER_ID:
            return {
                ...state,
                order_id: action.payload.order_id,
            };
        case UPDATE_TYPE:
            return {
                ...state,
                type: action.payload.type,
            };
        case UPDATE_CARGO_LETTER:
            return {
                ...state,
                cargo_letter: action.payload.cargo_letter,
            };
        case UPDATE_CARGO_NUM:
            return {
                ...state,
                cargo_num: action.payload.cargo_num,
            };
        case UPDATE_CARGO_CHECK_NUM:
            return {
                ...state,
                cargo_check_num: action.payload.cargo_check_num,
            };
        case UPDATE_LOCATION:
            return {
                ...state,
                location: action.payload.location,
            };
        case UPDATE_RMB:
            return {
                ...state,
                rmb: action.payload.rmb,
            };
        case UPDATE_HKD:
            return {
                ...state,
                hkd: action.payload.hkd,
            };
        case UPDATE_ADD:
            return {
                ...state,
                add: action.payload.add,
            };
        case UPDATE_SHIPPING:
            return {
                ...state,
                shipping: action.payload.shipping,
            };
        case UPDATE_REMARK:
            return {
                ...state,
                remark: action.payload.remark,
            };
        case SET_ERROR:
            return {
                ...state,
                error: {
                    ...action.payload.error,
                },
            };
        case UPDATE_IMAGE:
            return {
                ...state,
                image: action.payload.image,
            };
        default:
            return {
                ...state,
                ...action.payload,
            };
    }
};

/**
 * 增加紀錄
 * @type {React.FC<{navigation: NativeStackNavigationProp<RootStackParamList, 'AddRecord'>;
 *                  route: RouteProp<RootStackParamList, 'AddRecord'>}>}
 */
const AddRecord = ({navigation, route}) => {
    const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
    const [state, dispatch] = useReducer(reducer, RECORD_INITIAL_STATE); //輸入資料
    const focusing_dec_input = useRef(null); //目前聚焦銀碼輸入框
    const need_save_draft = useRef(true); //是否儲存草稿
    const [setting] = useSetting(); //設定
    const rate = parseFloat(setting ? setting.Rate : 0);
    const [scroll_offset, setScrollOffset] = useState(0); //滾動位移
    const header_height = useHeaderHeight(); //取得標題欄高度
    const [is_keyboard_visible, setIsKeyboardVisible] = useState(false); //鍵盤是否顯示

    //textInput refs
    let inputs = useRef({
        order_id: null,
        cargo_letter: null,
        cargo_num: null,
        cargo_check_num: null,
        local: null,
        rmb: null,
        hkd: null,
        add: null,
        shipping: null,
        remark: null,
    });
    let num_keyboard_refs = useRef(null);

    /* 對焦到下一個輸入欄 */
    const focusNextField = useCallback(id => {
        inputs.current[id].focus();
    }, []);

    /* 對焦金錢輸入欄 => 打開虛擬鍵盤 */
    const decimalInputFocus = useCallback(id => {
        focusing_dec_input.current = id;
        num_keyboard_refs.current.openKeyBoard();
    }, []);

    /* 失焦金錢輸入欄 => 關閉虛擬鍵盤 */
    const decimalInputBlur = useCallback(() => {
        focusing_dec_input.current = null;
        num_keyboard_refs.current.closeKeyBoard();
    }, []);

    /* 虛擬鍵盤點擊 */
    const onKeyPress = useCallback(
        value => {
            if (focusing_dec_input.current) {
                if (value === 'back') {
                    //刪除最後一個文字
                    inputs.current[focusing_dec_input.current].setText(
                        inputs.current[focusing_dec_input.current].getText().slice(0, -1),
                    );
                } else if (value === 'done') {
                    //完成輸入
                    focusNextField(
                        Object.keys(inputs.current)[
                            Object.keys(inputs.current).indexOf(focusing_dec_input.current) + 1
                        ],
                    );
                } else if (value === 'calculator') {
                    //跳轉到計算機
                    navigation.navigate('Calculator', {
                        input_id: focusing_dec_input.current,
                        page_name: 'AddRecord',
                    });
                } else {
                    //輸入文字
                    inputs.current[focusing_dec_input.current].setText(
                        inputs.current[focusing_dec_input.current].getText() + value,
                    );
                }
            }
        },
        [focusNextField, navigation],
    );

    /* 計算機返回輸入欄位id */
    useEffect(() => {
        if (route.params && route.params.value && route.params.input_id) {
            inputs.current[route.params.input_id].setText(route.params.value.toString());
        }
    }, [route.params]);

    /* 遞交 */
    const submit = useCallback(async () => {
        let error = {
            cargo: null,
            location: null,
            order_id: null,
        };

        //檢查條件
        if (state.order_id.length > 0 && state.order_id.length < 9) {
            error.order_id = '未完成填寫';
        }
        if (state.cargo_letter.length <= 0 || state.cargo_num.length <= 0 || state.cargo_check_num.length <= 0) {
            error.cargo = '必須填寫';
        } else if (state.cargo_letter.length < 4 || state.cargo_num.length < 6 || state.cargo_check_num.length < 1) {
            error.cargo = '未完成填寫';
        } /*else if(!CargoNumCheck(state.cargo_letter, state.cargo_num, parseInt(state.cargo_check_num))){
            error.cargo = '填寫錯誤';
        }*/
        if (state.location.length <= 0) {
            error.location = '必須填寫';
        }

        dispatch({type: SET_ERROR, payload: {error: {...error}}});
        if (Object.values(error).findIndex(value => value !== null) >= 0) return; //是否全部已通過

        //通過放入資料庫
        const cargo_num_full = state.cargo_letter + state.cargo_num + state.cargo_check_num; //組合櫃號
        try {
            await DB.transaction(async function (tr) {
                await tr.executeSql(
                    'INSERT INTO Record (`DateTime`, OrderNum, Type, CargoNum, Local, RMB, HKD, `Add`, Shipping, Remark, Images, Rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        moment(state.date).format('yyyy-MM-DD'),
                        state.order_id,
                        state.type,
                        cargo_num_full,
                        state.location,
                        state.rmb,
                        state.hkd,
                        state.add,
                        state.shipping,
                        state.remark,
                        JSON.stringify(state.image),
                        rate,
                    ],
                );
            });
        } catch (e) {
            console.log('傳輸錯誤: ' + e.message); //debug
            ToastAndroid.show('新增失敗', ToastAndroid.SHORT);
            return;
        }

        //成功
        need_save_draft.current = false;
        AsyncStorage.removeItem('Draft').then();
        navigation.popTo('Main', {showDay: state.date.toString()}); //go back home
    }, [
        rate,
        navigation,
        state.add,
        state.hkd,
        state.rmb,
        state.cargo_check_num,
        state.cargo_letter,
        state.cargo_num,
        state.date,
        state.image,
        state.location,
        state.order_id,
        state.remark,
        state.shipping,
        state.type,
    ]);

    /* 讀取草稿 */
    useEffect(() => {
        //讀取
        const getDraft = async () => {
            try {
                const draft = await AsyncStorage.getItem('Draft');
                await AsyncStorage.removeItem('Draft');
                return draft != null ? JSON.parse(draft) : null;
            } catch (e) {
                console.log('Read Daft error: ', e);
            }
        };

        //處理
        getDraft().then(draft => {
            if (draft != null) {
                draft.date = new Date(draft.date);
                dispatch({payload: {...draft}});
            }
        });
    }, []);

    // 監聽鍵盤顯示隱藏
    useEffect(() => {
        // 虛擬鍵盤顯示狀態
        const keyboard_did_show_listener = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
        // 虛擬鍵盤隱藏狀態
        const keyboard_did_hide_listener = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

        // 清除事件
        return () => {
            keyboard_did_show_listener.remove();
            keyboard_did_hide_listener.remove();
        };
    }, []);

    /* 處理返回按鈕 */
    useEffect(() => {
        const back_handler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (focusing_dec_input.current !== null) {
                //打開了自定義數字鍵盤行為
                inputs.current[focusing_dec_input.current].blur();
                return true;
            }
        });

        //清除活動監聽器
        return () => back_handler.remove();
    }, [focusing_dec_input]);

    /* 處理退出頁面 儲存草稿 */
    useEffect(() => {
        //儲存
        const storeDraft = async () => {
            try {
                let draft = JSON.stringify(state);
                await AsyncStorage.setItem('Draft', draft);
                ToastAndroid.show('已儲存為草稿', ToastAndroid.SHORT);
            } catch (e) {
                console.log('Save Daft error: ', e);
            }
        };

        //處理
        const before_remove_listener = navigation.addListener('beforeRemove', () => {
            //清除活動監聽器
            if (need_save_draft.current) storeDraft().then(); //儲存草稿
        });
        return before_remove_listener;
    }, [navigation, state]);

    /* 滾動事件 */
    const onScroll = useCallback(({nativeEvent}) => {
        setScrollOffset(nativeEvent.contentOffset.y);
    }, []);

    return (
        <View style={{flex: 1}}>
            <KeyboardAvoidingView
                style={{flex: 1}}
                behavior={'padding'}
                keyboardVerticalOffset={header_height}
                enabled={is_keyboard_visible}>
                <ScrollView
                    nestedScrollEnabled={true}
                    onScroll={onScroll}
                    keyboardShouldPersistTaps={'handled'}
                    style={{
                        flex: 1,
                    }}>
                    <View
                        style={[
                            style.data_view,
                            {
                                backgroundColor: is_dark_mode ? Color.darkBlock : Color.white,
                            },
                        ]}>
                        {/* 日期 */}
                        <View style={style.form_group}>
                            <Text style={{flex: 1 / 5}}>日期</Text>
                            <TextInput
                                caretHidden={true}
                                showSoftInputOnFocus={false}
                                contextMenuHidden={true}
                                onPressOut={() => {
                                    Keyboard.dismiss();
                                    DateTimePickerAndroid.open({
                                        value: state.date,
                                        onChange: (event, newDate) => {
                                            focusNextField('order_id');
                                            dispatch({type: UPDATE_DATE, payload: {date: newDate}});
                                        },
                                    });
                                }}
                                value={moment(state.date).format('D/M/yyyy')}
                                style={{flex: 1}}
                            />
                        </View>
                        {/* 單號 */}
                        <View style={style.form_group}>
                            <Text style={{flex: 1 / 5}}>單號</Text>
                            <View style={{flex: 1}}>
                                <TextInput
                                    placeholder={'03/09/020'}
                                    keyboardType="numeric"
                                    returnKeyType={'next'}
                                    maxLength={9}
                                    onSubmitEditing={() => focusNextField('cargo_letter')}
                                    ref={ref => (inputs.current.order_id = ref)}
                                    onBlur={text =>
                                        dispatch({
                                            type: UPDATE_ORDER_ID,
                                            payload: {order_id: text},
                                        })
                                    }
                                    render={props => <TextInputMask {...props} mask={'[00]/[00]/[000]'} />}
                                    error={state.error.order_id !== null}
                                    value={state.order_id}
                                />
                                <ErrorHelperText visible={state.error.order_id !== null}>
                                    {state.error.order_id}
                                </ErrorHelperText>
                            </View>
                        </View>
                        {/* 類型 */}
                        <View style={style.form_group}>
                            <Text style={{flex: 1 / 5}}>類型</Text>
                            <RadioGroup
                                containerStyle={{justifyContent: 'space-between', flex: 1}}
                                onPress={value => dispatch({type: UPDATE_TYPE, payload: {type: value}})}>
                                <RadioButton
                                    value={'20'}
                                    label={'20'}
                                    color={Color.primaryColor}
                                    selected={state.type === '20'}
                                />
                                <RadioButton
                                    value={'40'}
                                    label={'40'}
                                    color={Color.primaryColor}
                                    selected={state.type === '40'}
                                />
                                <RadioButton
                                    value={'45'}
                                    label={'45'}
                                    color={Color.primaryColor}
                                    selected={state.type === '45'}
                                />
                            </RadioGroup>
                        </View>
                        {/* 櫃號 */}
                        <View style={style.form_group}>
                            <Text style={{flex: 1 / 5}}>櫃號</Text>
                            <View style={[{flex: 1}, style.flex_row]}>
                                <View style={{flex: 1 / 2, marginRight: 4}}>
                                    <TextInput
                                        error={state.error.cargo !== null}
                                        value={state.cargo_letter}
                                        placeholder={'AAAA'}
                                        returnKeyType={'next'}
                                        maxLength={4}
                                        onSubmitEditing={() => focusNextField('cargo_num')}
                                        ref={ref => (inputs.current.cargo_letter = ref)}
                                        onChangeText={text => {
                                            dispatch({
                                                type: UPDATE_CARGO_LETTER,
                                                payload: {cargo_letter: text.toUpperCase()},
                                            });
                                        }}
                                        render={props => (
                                            <TextInputMask {...props} selectTextOnFocus={true} mask={'[AAAA]'} />
                                        )}
                                    />
                                    <ErrorHelperText visible={state.error.cargo !== null}>
                                        {state.error.cargo}
                                    </ErrorHelperText>
                                </View>
                                <View style={{flex: 1, marginRight: 4}}>
                                    <TextInput
                                        placeholder={'000000'}
                                        keyboardType="numeric"
                                        returnKeyType={'next'}
                                        maxLength={6}
                                        error={state.error.cargo !== null}
                                        value={state.cargo_num}
                                        onSubmitEditing={() => focusNextField('cargo_check_num')}
                                        onChangeText={text => {
                                            dispatch({type: UPDATE_CARGO_NUM, payload: {cargo_num: text}});
                                        }}
                                        ref={ref => (inputs.current.cargo_num = ref)}
                                        render={props => <TextInputMask {...props} mask={'[000000]'} />}
                                    />
                                    <ErrorHelperText visible={state.error.cargo !== null}>{}</ErrorHelperText>
                                </View>
                                <Text>(</Text>
                                <View style={{flex: 1 / 4}}>
                                    <TextInput
                                        placeholder={'0'}
                                        keyboardType="numeric"
                                        returnKeyType={'next'}
                                        value={state.cargo_check_num}
                                        maxLength={1}
                                        error={state.error.cargo !== null}
                                        style={{textAlign: 'center', marginHorizontal: 2}}
                                        onSubmitEditing={() => focusNextField('local')}
                                        onChangeText={text =>
                                            dispatch({
                                                type: UPDATE_CARGO_CHECK_NUM,
                                                payload: {cargo_check_num: text},
                                            })
                                        }
                                        ref={ref => (inputs.current.cargo_check_num = ref)}
                                        render={props => <TextInputMask {...props} mask={'[0]'} />}
                                    />
                                    <ErrorHelperText visible={state.error.cargo !== null}>{}</ErrorHelperText>
                                </View>
                                <Text>)</Text>
                            </View>
                        </View>
                        {/* 地點 */}
                        <View style={style.form_group}>
                            <Text style={{flex: 1 / 5}}>地點</Text>
                            <LocalInput
                                ref={ref => {
                                    inputs.current.local = ref;
                                }}
                                value={state.location}
                                onChangeText={text =>
                                    dispatch({
                                        type: UPDATE_LOCATION,
                                        payload: {location: text},
                                    })
                                }
                                onSubmitEditing={() => focusNextField('rmb')}
                                error={state.error.location}
                                scrollOffset={scroll_offset}
                            />
                        </View>
                        {/* 人民幣 */}
                        <View style={style.form_group}>
                            <Text style={{flex: 1 / 5}}>人民幣</Text>
                            <View style={[{flex: 1}, style.flex_row]}>
                                <View style={{flex: 1, marginRight: 4}}>
                                    <DecimalInput
                                        ref={ref => {
                                            inputs.current.rmb = ref;
                                        }}
                                        containerStyle={{flex: 1}}
                                        inputStyle={style.form_input}
                                        placeholder={'¥ --'}
                                        inputProps={{showSoftInputOnFocus: false}}
                                        onValueChange={value =>
                                            dispatch({
                                                type: UPDATE_RMB,
                                                payload: {rmb: value},
                                            })
                                        }
                                        symbol={'¥ '}
                                        keyboardRef={num_keyboard_refs}
                                        onFocus={() => decimalInputFocus('rmb')}
                                        onBlur={decimalInputBlur}
                                        value={state.rmb}
                                        onPressIn={() => Keyboard.dismiss()}
                                    />
                                    <HelperText type={'info'}>
                                        匯率: 100 港幣 = {(100 * rate).toFixed(2)} 人民幣
                                    </HelperText>
                                </View>
                                <Text>折算 HK$ {(state.rmb / rate).toFixed(2)}</Text>
                            </View>
                        </View>
                        {/* 港幣 */}
                        <View style={style.form_group}>
                            <Text style={{flex: 1 / 5}}>港幣</Text>
                            <DecimalInput
                                ref={ref => {
                                    inputs.current.hkd = ref;
                                }}
                                containerStyle={{flex: 1}}
                                value={state.hkd}
                                inputStyle={style.form_input}
                                placeholder={'$ --'}
                                inputProps={{showSoftInputOnFocus: false}}
                                onValueChange={value => dispatch({type: UPDATE_HKD, payload: {hkd: value}})}
                                symbol={'$ '}
                                onFocus={() => decimalInputFocus('hkd')}
                                onBlur={decimalInputBlur}
                                onPressIn={() => Keyboard.dismiss()}
                            />
                        </View>
                        {/* 加收&運費 */}
                        <View style={style.form_group}>
                            <View style={[{flex: 1 / 2}, style.flex_row]}>
                                <Text style={{flex: 1 / 2}}>加收</Text>
                                <DecimalInput
                                    ref={ref => {
                                        inputs.current.add = ref;
                                    }}
                                    containerStyle={{flex: 1}}
                                    value={state.add}
                                    inputStyle={style.form_input}
                                    placeholder={'$ --'}
                                    inputProps={{showSoftInputOnFocus: false}}
                                    onValueChange={value =>
                                        dispatch({
                                            type: UPDATE_ADD,
                                            payload: {add: value},
                                        })
                                    }
                                    symbol={'$ '}
                                    onFocus={() => decimalInputFocus('add')}
                                    onBlur={decimalInputBlur}
                                    onPressIn={() => Keyboard.dismiss()}
                                />
                            </View>
                            <View style={[{flex: 1 / 2}, style.flex_row]}>
                                <Text style={{flex: 1 / 2}}>運費</Text>
                                <DecimalInput
                                    ref={ref => {
                                        inputs.current.shipping = ref;
                                    }}
                                    containerStyle={{flex: 1}}
                                    value={state.shipping}
                                    inputStyle={style.form_input}
                                    placeholder={'$ --'}
                                    inputProps={{showSoftInputOnFocus: false}}
                                    onValueChange={value =>
                                        dispatch({
                                            type: UPDATE_SHIPPING,
                                            payload: {shipping: value},
                                        })
                                    }
                                    symbol={'$ '}
                                    onFocus={() => decimalInputFocus('shipping')}
                                    onBlur={decimalInputBlur}
                                    onPressIn={() => Keyboard.dismiss()}
                                />
                            </View>
                        </View>
                    </View>
                    {/* 備註 */}
                    <View
                        style={[
                            style.remark_view,
                            {
                                backgroundColor: is_dark_mode ? Color.darkBlock : Color.white,
                            },
                        ]}>
                        <View style={[style.form_group, {marginTop: -10}]}>
                            <TextInput
                                ref={ref => {
                                    inputs.current.remark = ref;
                                }}
                                label={'備註'}
                                returnKeyType={'done'}
                                maxLength={50}
                                value={state.remark}
                                onChangeText={text => dispatch({type: UPDATE_REMARK, payload: {remark: text}})}
                                style={{flex: 1}}
                            />
                        </View>
                        <View style={style.form_group}>
                            <ImagePicker
                                assets={state.image}
                                onSelectedImage={img =>
                                    dispatch({
                                        type: UPDATE_IMAGE,
                                        payload: {image: img},
                                    })
                                }
                            />
                        </View>
                    </View>
                    {/* 儲存 */}
                    <View
                        style={[
                            style.remark_view,
                            {
                                backgroundColor: is_dark_mode ? Color.darkBlock : Color.white,
                            },
                        ]}>
                        <View style={[style.flex_row, {justifyContent: 'space-between'}]}>
                            <Text>合計</Text>
                            <Text style={{color: Color.primaryColor, fontSize: 20}}>
                                HK$ {(state.shipping + state.add + state.hkd + state.rmb / rate).toFixed(2)}
                            </Text>
                        </View>
                        <Button icon={'content-save-outline'} mode={'contained'} onPress={submit}>
                            儲存
                        </Button>
                    </View>
                    <View style={{height: 100}} />
                </ScrollView>
            </KeyboardAvoidingView>
            <NumKeyboard ref={num_keyboard_refs} onKeyPress={onKeyPress} />
        </View>
    );
};

/* 地點input */
const LocalInput = forwardRef(({value, onSubmitEditing, error = null, scrollOffset, onChangeText}, ref) => {
    const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
    const [auto_complete_list, setAutoCompleteList] = useState([]); //自動完成
    const [input_text, setInputText] = useState('');
    const [is_list_shown, setIsListShown] = useState(false);
    const [list_position, setListPosition] = useState('down'); //列表在上方顯示還在下方顯示
    const device_height = useWindowDimensions().height; //
    const [keyboard_height, setKeyboardHeight] = useState(0); //
    const is_focus = useRef(false); //是否聚焦
    const list_ref = useRef(null); //列表ref

    /* 文字被更改 */
    const onChange = text => {
        setInputText(text);
        onChangeText(text);
    };

    /* 聚焦 */
    const onFocus = () => {
        is_focus.current = true;
    };

    /* 預設文字 */
    useEffect(() => {
        setInputText(value);
    }, [value]);

    /* 關閉自動完成, 並且儲存值 */
    function closeAndSave(callback) {
        switchShowList(false, () => {
            callback && callback();
        });
    }

    /* 自動完成 表列文字 */
    const ListText = ({item}) => {
        let word_index = item.search(new RegExp(input_text, 'i'));

        let first = item.substring(0, word_index);
        let correct = item.substring(word_index, word_index + input_text.length); //符合文字
        let last = item.substring(word_index + input_text.length);

        return (
            <Text>
                <Text>{first}</Text>
                <Text style={{color: Color.primaryColor}}>{correct}</Text>
                <Text>{last}</Text>
            </Text>
        );
    };

    /* 開啟動畫 */
    const fade_anim = useRef(new Animated.Value(0)).current;
    const scale_anim = useRef(new Animated.Value(0.8)).current;

    /* 切換開啟關閉狀態 */
    const switchShowList = useCallback(
        (setShow, callback = () => null) => {
            if (setShow) {
                //開啟
                setIsListShown(true);
                Animated.timing(fade_anim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
                Animated.timing(scale_anim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            } else {
                //關閉
                Animated.timing(fade_anim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
                Animated.timing(scale_anim, {
                    toValue: 0.8,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => {
                    setIsListShown(false);
                    callback();
                    setListPosition('down');
                });
            }
        },
        [fade_anim, scale_anim],
    );

    /* 判斷空間是否充足 */
    useEffect(() => {
        if (!is_list_shown) return;

        const timeout_id = setTimeout(() => {
            list_ref.current.measure((fx, fy, w, h, px, py) => {
                const tmp = device_height - keyboard_height - py - h - (list_position === 'up' ? h : 0); //如果已處於上方, 則再減高度
                // console.log(deviceHeight, keybordHeight, py, h, scrollOffset);
                // console.log(tmp, tmp <= 10);
                // 如果下方空間不夠側跳往上方
                if (tmp <= 10) {
                    setListPosition('up');
                } else {
                    setListPosition('down');
                }
            });
        }, 5);

        return () => clearTimeout(timeout_id);
    }, [is_list_shown, input_text, scrollOffset, device_height, keyboard_height, list_position]);

    /* 取得鍵盤高度 */
    useEffect(() => {
        const show_event = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
        const hide_event = Keyboard.addListener('keyboardDidHide', e => setKeyboardHeight(0));

        // 清除事件
        return () => {
            show_event.remove();
            hide_event.remove();
        };
    }, []);

    /* 向數據庫取數據(autocomplete) */
    useEffect(() => {
        if (!is_focus.current) return; //非聚焦狀態不處理

        //提取數據
        const extracted = async () => {
            try {
                await DB.readTransaction(async function (tr) {
                    const [, rs] = await tr.executeSql(
                        'SELECT DISTINCT Local FROM Record WHERE Local LIKE ? LIMIT 10',
                        ['%' + input_text + '%'],
                    );

                    if (rs.rows.length <= 0 || input_text.length <= 0) {
                        switchShowList(false); //關閉列表 沒有數據
                    } else {
                        switchShowList(true);
                        let val = [];
                        for (let i = 0; i < rs.rows.length; i++) {
                            val.push(rs.rows.item(i).Local);
                        }
                        setAutoCompleteList(val);
                    }
                });
            } catch (e) {
                console.error('傳輸錯誤: ' + e.message);
                ToastAndroid.show('讀取失敗', ToastAndroid.SHORT);
            }
        };

        extracted().then();
    }, [input_text, switchShowList]);

    return (
        <View style={{position: 'relative', flex: 1}}>
            <TextInput
                onChangeText={onChange}
                value={input_text}
                autoComplete={'off'}
                onSubmitEditing={() => closeAndSave(onSubmitEditing)}
                returnKeyType={'next'}
                error={error !== null}
                onBlur={() => closeAndSave()}
                ref={ref}
                onFocus={onFocus}
            />
            <ErrorHelperText visible={error !== null}>{error}</ErrorHelperText>
            <Animated.View
                ref={list_ref}
                style={[
                    style.auto_complete_view,
                    {
                        backgroundColor: is_dark_mode ? Color.darkColor : Color.white,
                        opacity: fade_anim,
                        display: is_list_shown ? undefined : 'none',
                        transform: [{scale: scale_anim}],
                        top: list_position === 'up' ? null : '100%',
                        bottom: list_position === 'down' ? null : '100%',
                    },
                ]}>
                <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps={'always'}>
                    {auto_complete_list.map((data, index) => (
                        <TouchableWithoutFeedback onPress={() => onChange(data)} key={index}>
                            <View style={{flex: 1, paddingVertical: 8}}>
                                <ListText item={data} />
                            </View>
                        </TouchableWithoutFeedback>
                    ))}
                </ScrollView>
            </Animated.View>
        </View>
    );
});

/* 圖片選擇器Options */
const IMAGE_PICKER_OPTIONS = {
    mediaType: 'photo',
    quality: 0.8,
    cameraType: 'back',
    includeBase64: true,
    includeExtra: false,
    saveToPhotos: true,
    selectionLimit: 3,
};

/* 圖片選擇器 */
const ImagePicker = ({onSelectedImage, assets = []}) => {
    const [is_mode_dropdown_shown, setIsModeDropdownShown] = useState(false);
    const [images, setImages] = useState(assets); //圖片
    const [big_image_index, setBigImageIndex] = useState(null); //大圖

    /* 處理結果 */
    const fetchResult = useCallback(
        result => {
            if (result.didCancel) return;
            if (result.errorMessage) return;
            if (result.errorCode === 'camera_unavailable') {
                ToastAndroid.show('相機不可用', ToastAndroid.SHORT);
                return;
            }
            if (result.errorCode === 'permission') {
                ToastAndroid.show('沒有權限', ToastAndroid.SHORT);
                return;
            }

            //處理圖片
            const img_base64 = [...result.assets];
            img_base64.push(...images);
            img_base64.splice(3);

            setImages(img_base64);
            onSelectedImage(img_base64);
        },
        [images, onSelectedImage],
    );

    /* 打開選擇器 */
    const openPicker = useCallback(
        type => {
            setIsModeDropdownShown(false);
            if (type === 0) {
                //相機
                launchCamera(IMAGE_PICKER_OPTIONS).then(fetchResult);
            } else if (type === 1) {
                //相簿
                launchImageLibrary(IMAGE_PICKER_OPTIONS).then(fetchResult);
            }
        },
        [fetchResult],
    );

    /* 圖片檢視器列表 */
    const images_viewer_list = useMemo(() => {
        return images.map((assets1, index) => ({
            url: 'data:image/jpeg;base64,' + assets1.base64,
            width: assets1.width,
            height: assets1.height,
            props: {
                key: index,
            },
        }));
    }, [images]);

    /* 參數更新 */
    useEffect(() => {
        setImages(assets);
    }, [assets]);

    return (
        <View style={{flex: 1}}>
            <Menu
                visible={is_mode_dropdown_shown}
                onDismiss={() => setIsModeDropdownShown(false)}
                anchor={
                    <Button icon={'camera'} mode={'outlined'} onPress={() => setIsModeDropdownShown(true)}>
                        選擇圖片
                    </Button>
                }>
                <Menu.Item onPress={() => openPicker(0)} title={'相機'} leadingIcon={'camera'} key={1} />
                <Menu.Item onPress={() => openPicker(1)} title={'相簿'} leadingIcon={'image-album'} key={2} />
            </Menu>
            <View style={[style.form_group]}>
                {images.map((assets2, index) => (
                    <REAnimated.View
                        style={[style.img_view, {marginLeft: index !== 0 && 5}]}
                        entering={StretchInX}
                        layout={LinearTransition.duration(300).delay(300)}
                        key={index}>
                        <TouchableWithoutFeedback onPress={() => setBigImageIndex(index)}>
                            <REAnimated.Image
                                source={{uri: 'data:image/jpeg;base64,' + assets2.base64}}
                                style={{flex: 1}}
                                layout={LinearTransition.duration(300).delay(300)}
                            />
                        </TouchableWithoutFeedback>
                        <IconButton
                            icon={'close'}
                            size={20}
                            iconColor={Color.white}
                            containerColor={Color.darkBlock}
                            style={{position: 'absolute', top: 0, right: 0}}
                            onPress={() => {
                                setImages(images.filter((_, i) => i !== index));
                                onSelectedImage(images.filter((_, i) => i !== index));
                            }}
                            layout={LinearTransition.duration(300).delay(300)}
                        />
                    </REAnimated.View>
                ))}
            </View>
            <Modal
                visible={big_image_index !== null}
                transparent={true}
                animationType={'fade'}
                onRequestClose={() => setBigImageIndex(null)}>
                <ImageViewer
                    backgroundColor={'rgba(0,0,0,0.6)'}
                    imageUrls={images_viewer_list}
                    index={big_image_index}
                    onCancel={() => setBigImageIndex(null)}
                    loadingRender={() => <ActivityIndicator animating={true} />}
                    enableSwipeDown={true}
                    footerContainerStyle={{width: '100%', position: 'absolute', bottom: 20, zIndex: 9999}}
                    renderFooter={() => (
                        <View style={[style.flex_row, {justifyContent: 'center'}]}>
                            <IconButton
                                icon={'close'}
                                size={30}
                                iconColor={Color.white}
                                style={style.image_viewer_close_btn}
                                onPress={() => setBigImageIndex(null)}
                            />
                        </View>
                    )}
                />
            </Modal>
        </View>
    );
};

const style = StyleSheet.create({
    image_viewer_close_btn: {
        borderColor: Color.white,
        borderStyle: 'solid',
        borderWidth: 1,
    },
    img_view: {
        flex: 1,
        height: 150,
        borderRadius: 5,
        overflow: 'hidden',
    },
    form_group: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    auto_complete_view: {
        flex: 1,
        maxHeight: 200,
        width: '90%',
        position: 'absolute',
        elevation: 5,
        zIndex: 5,
        borderRadius: 10,
        padding: 5,
    },
    remark_view: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: 0.7,
        borderTopWidth: 0.7,
        marginTop: 10,
        padding: 10,
        elevation: -1,
    },
    data_view: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: 0.7,
        padding: 10,
    },
    flex_row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    form_input: {},
});

export {AddRecord, LocalInput, ImagePicker, RECORD_INITIAL_STATE as recordInitialState};
