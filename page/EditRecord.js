import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {
    BackHandler,
    Keyboard,
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    ToastAndroid,
    useColorScheme,
    View,
} from 'react-native';
import moment from 'moment';
import {Color} from '../module/Color';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {DecimalInput} from '../module/NumInput';
import {NumKeyboard} from '../module/NumKeyboard';
import TextInput from '../module/TextInput';
import {Button, HelperText, Text} from 'react-native-paper';
import TextInputMask from 'react-native-text-input-mask';
import {RadioButton, RadioGroup} from '../module/RadioButton';
import {DB, useSetting} from '../module/SQLite';
import ErrorHelperText from '../module/ErrorHelperText';
import {RECORD_INITIAL_STATE} from './AddRecord';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useHeaderHeight} from '@react-navigation/elements';
import {Decimal} from 'decimal.js';
import {LocalInput} from '../module/LocalInput';
import {ImagePicker} from '../module/ImagePicker';
/** @typedef {import('@react-navigation/native-stack').NativeStackNavigationProp} NativeStackNavigationProp */
/** @typedef {import('@react-navigation/native').RouteProp} RouteProp */
/** @typedef {import('../module/IRootStackParamList').IRootStackParamList} RootStackParamList */

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
                rmb: new Decimal(action.payload.rmb || 0),
            };
        case UPDATE_HKD:
            return {
                ...state,
                hkd: new Decimal(action.payload.hkd || 0),
            };
        case UPDATE_ADD:
            return {
                ...state,
                add: new Decimal(action.payload.add || 0),
            };
        case UPDATE_SHIPPING:
            return {
                ...state,
                shipping: new Decimal(action.payload.shipping || 0),
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
 * 編輯紀錄頁面
 * @type {React.FC<{navigation: NativeStackNavigationProp<RootStackParamList, 'EditRecord'>, route: RouteProp<RootStackParamList, 'EditRecord'>}>}
 */
const EditRecord = ({navigation, route}) => {
    const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
    const [state, dispatch] = useReducer(reducer, RECORD_INITIAL_STATE); //輸入資料
    const [record_id] = useState(route.params.recordID); //recordID
    const focusing_dec_input = useRef(null); //目前聚焦銀碼輸入框
    const [setting] = useSetting(); //設定
    const [rate, setRate] = useState(new Decimal(0));
    const [scroll_offset, setScrollOffset] = useState(0); //滾動位移
    const height = useHeaderHeight(); //取得標題欄高度
    const [keyboard_visible, setKeyboardVisible] = useState(false); //鍵盤是否顯示

    //textInput refs
    let inputs = useRef({
        order_id: null,
        cargo_letter: null,
        cargo_num: null,
        cargo_check_num: null,
        location: null,
        rmb: null,
        hkd: null,
        add: null,
        shipping: null,
        remark: null,
    });
    let num_keyboard_refs = useRef(null);

    // 對焦到下一個輸入欄
    const focusNextField = useCallback(id => {
        inputs.current[id].focus();
    }, []);

    // 對焦金錢輸入欄 => 打開虛擬鍵盤
    const decimalInputFocus = useCallback(id => {
        focusing_dec_input.current = id;
        num_keyboard_refs.current.openKeyBoard();
    }, []);

    // 失焦金錢輸入欄 => 關閉虛擬鍵盤
    const decimalInputBlur = useCallback(() => {
        focusing_dec_input.current = null;
        num_keyboard_refs.current.closeKeyBoard();
    }, []);

    // 虛擬鍵盤點擊
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
                        inputID: focusing_dec_input.current,
                        pageName: 'EditRecord',
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

    // 遞交
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
                    'UPDATE Record SET `DateTime` = ?, OrderNum = ?, Type = ?, CargoNum = ?, Local = ?, RMB = ?, HKD = ?, `Add` = ?, Shipping = ?, Remark = ?, Images = ?, Rate = ? WHERE RecordID = ?',
                    [
                        moment(state.date).format('yyyy-MM-DD'),
                        state.order_id,
                        state.type,
                        cargo_num_full,
                        state.location,
                        state.rmb.toString(),
                        state.hkd.toString(),
                        state.add.toString(),
                        state.shipping.toString(),
                        state.remark,
                        JSON.stringify(state.image),
                        rate.toString(),
                        record_id,
                    ],
                );
            });
        } catch (e) {
            console.error('傳輸錯誤: ' + e.message);
            ToastAndroid.show('更新失敗', ToastAndroid.SHORT);
            return;
        }

        //成功
        navigation.popTo('Main', {showDay: state.date.toString()}); //go back home
    }, [
        state.order_id,
        state.cargo_letter,
        state.cargo_num,
        state.cargo_check_num,
        state.location,
        state.date,
        state.type,
        state.rmb,
        state.hkd,
        state.add,
        state.shipping,
        state.remark,
        state.image,
        navigation,
        rate,
        record_id,
    ]);

    // 複製
    const copy = useCallback(() => {
        const storeDraft = async () => {
            try {
                let draft = JSON.stringify(state);
                await AsyncStorage.setItem('Draft', draft);
            } catch (e) {
                console.log('Save Daft error: ', e);
            }
        };

        //儲存後跳轉頁面
        storeDraft().then(() => navigation.replace('AddRecord'));
    }, [navigation, state]);

    // 設定變更時更新匯率
    useEffect(() => {
        setRate(new Decimal(setting.Rate ?? 0));
    }, [setting.Rate]);

    // route 處理
    useEffect(() => {
        if (route.params) {
            //計算機返回輸入欄位id
            if (route.params.value && route.params.inputID) {
                inputs.current[route.params.inputID].setText(route.params.value.toString());
            }

            //取得紀錄
            if (route.params.recordID) {
                const extractData = async () => {
                    try {
                        await DB.transaction(async function (tr) {
                            console.log('顯示: ', route.params.recordID);
                            const [, rs] = await tr.executeSql('SELECT * FROM Record WHERE RecordID = ?', [
                                route.params.recordID,
                            ]);

                            //無此紀錄
                            if (rs.rows.length <= 0) {
                                console.log('找不到紀錄');
                                ToastAndroid.show('找不到紀錄', ToastAndroid.SHORT);
                                navigation.goBack();
                                return;
                            }

                            //有此紀錄
                            const row = rs.rows.item(0);
                            dispatch({
                                payload: {
                                    date: new Date(row.DateTime),
                                    order_id: row.OrderNum,
                                    type: row.Type,
                                    cargo_letter: row.CargoNum.slice(0, 4),
                                    cargo_num: row.CargoNum.slice(4, 10),
                                    cargo_check_num: row.CargoNum.slice(10),
                                    location: row.Local,
                                    rmb: new Decimal(row.RMB || 0),
                                    hkd: new Decimal(row.HKD || 0),
                                    add: new Decimal(row.Add || 0),
                                    shipping: new Decimal(row.Shipping || 0),
                                    remark: row.Remark,
                                    image: JSON.parse(row.Images),
                                },
                            });
                            setRate(new Decimal(row.Rate || 0));
                        });
                    } catch (e) {
                        console.error('取得資料錯誤: ' + e.message);
                        ToastAndroid.show('取得資料失敗', ToastAndroid.SHORT);
                        return;
                    }

                    //成功
                    console.log('已取得資料');
                };

                extractData().then();
            }
        }
    }, [navigation, route.params]);

    // 監聽鍵盤顯示隱藏
    useEffect(() => {
        // 虛擬鍵盤顯示狀態
        const keyboard_did_show_listener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        // 虛擬鍵盤隱藏狀態
        const keyboard_did_hide_listener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

        // 清除事件
        return () => {
            keyboard_did_show_listener.remove();
            keyboard_did_hide_listener.remove();
        };
    }, []);

    // 處理返回按鈕
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

    // 滾動事件
    const scroll = useCallback(({nativeEvent}) => {
        setScrollOffset(nativeEvent.contentOffset.y);
    }, []);

    return (
        <View style={{flex: 1}}>
            <KeyboardAvoidingView style={{flex: 1}} keyboardVerticalOffset={height} enabled={keyboard_visible}>
                <ScrollView nestedScrollEnabled={true} onScroll={scroll} keyboardShouldPersistTaps={'handled'}>
                    <View style={[style.Data, {backgroundColor: is_dark_mode ? Color.darkBlock : Color.white}]}>
                        {/* 日期 */}
                        <View style={style.formGroup}>
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
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>單號</Text>
                            <View style={{flex: 1}}>
                                <TextInput
                                    placeholder={'03/09/020'}
                                    keyboardType="numeric"
                                    returnKeyType={'next'}
                                    maxLength={9}
                                    onSubmitEditing={() => focusNextField('cargo_letter')}
                                    ref={ref => (inputs.current.order_id = ref)}
                                    onChangeText={text =>
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
                        <View style={style.formGroup}>
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
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>櫃號</Text>
                            <View style={[{flex: 1}, style.Flex_row]}>
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
                                        onSubmitEditing={() => focusNextField('location')}
                                        onChangeText={text => {
                                            dispatch({
                                                type: UPDATE_CARGO_CHECK_NUM,
                                                payload: {cargo_check_num: text},
                                            });
                                        }}
                                        ref={ref => (inputs.current.cargo_check_num = ref)}
                                        render={props => <TextInputMask {...props} mask={'[0]'} />}
                                    />
                                    <ErrorHelperText visible={state.error.cargo !== null}>{}</ErrorHelperText>
                                </View>
                                <Text>)</Text>
                            </View>
                        </View>
                        {/* 地點 */}
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>地點</Text>
                            <LocalInput
                                ref={ref => {
                                    inputs.current.location = ref;
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
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>人民幣</Text>
                            <View style={[{flex: 1}, style.Flex_row]}>
                                <View style={{flex: 1, marginRight: 4}}>
                                    <DecimalInput
                                        ref={ref => {
                                            inputs.current.rmb = ref;
                                        }}
                                        containerStyle={{flex: 1}}
                                        placeholder={'¥ --'}
                                        inputProps={{showSoftInputOnFocus: false}}
                                        onValueChange={value =>
                                            dispatch({
                                                type: UPDATE_RMB,
                                                payload: {rmb: value},
                                            })
                                        }
                                        symbol={'¥ '}
                                        onFocus={() => decimalInputFocus('rmb')}
                                        onBlur={decimalInputBlur}
                                        value={state.rmb.toNumber()}
                                        onPressIn={() => Keyboard.dismiss()}
                                    />
                                    <HelperText type={'info'}>
                                        匯率: 100 港幣 = {rate.mul(100).toFixed(2)} 人民幣
                                    </HelperText>
                                </View>
                                {state.rmb.isZero() ? null : <Text>折算 HK$ {state.rmb.div(rate).toFixed(2)}</Text>}
                            </View>
                        </View>
                        {/* 港幣 */}
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>港幣</Text>
                            <DecimalInput
                                ref={ref => {
                                    inputs.current.hkd = ref;
                                }}
                                containerStyle={{flex: 1}}
                                value={state.hkd.toNumber()}
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
                        <View style={style.formGroup}>
                            <View style={[{flex: 1 / 2}, style.Flex_row]}>
                                <Text style={{flex: 1 / 2}}>加收</Text>
                                <DecimalInput
                                    ref={ref => {
                                        inputs.current.add = ref;
                                    }}
                                    containerStyle={{flex: 1}}
                                    value={state.add.toNumber()}
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
                            <View style={[{flex: 1 / 2}, style.Flex_row]}>
                                <Text style={{flex: 1 / 2}}>運費</Text>
                                <DecimalInput
                                    ref={ref => {
                                        inputs.current.shipping = ref;
                                    }}
                                    containerStyle={{flex: 1}}
                                    value={state.shipping.toNumber()}
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
                    <View style={[style.Remark, {backgroundColor: is_dark_mode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.formGroup, {marginTop: -10}]}>
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
                        <View style={style.formGroup}>
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
                    <View style={[style.Remark, {backgroundColor: is_dark_mode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.Flex_row, {justifyContent: 'space-between'}]}>
                            <Text>合計</Text>
                            <Text style={{color: Color.primaryColor, fontSize: 20}}>
                                HK${' '}
                                {state.shipping
                                    .plus(state.add)
                                    .plus(state.hkd)
                                    .plus(rate.isZero() ? 0 : state.rmb.div(rate))
                                    .toFixed(2)}
                            </Text>
                        </View>
                        <View style={{flexDirection: 'row'}}>
                            <Button
                                icon={'content-copy'}
                                mode={'outlined'}
                                onPress={copy}
                                style={{flex: 1, marginRight: 5}}>
                                複製
                            </Button>
                            <Button icon={'content-save-outline'} mode={'contained'} onPress={submit} style={{flex: 1}}>
                                更新
                            </Button>
                        </View>
                    </View>
                    <View style={{height: 100}} />
                </ScrollView>
            </KeyboardAvoidingView>
            <NumKeyboard ref={num_keyboard_refs} onKeyPress={onKeyPress} />
        </View>
    );
};

const style = StyleSheet.create({
    formGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    Remark: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: 0.7,
        borderTopWidth: 0.7,
        marginTop: 10,
        padding: 10,
        elevation: -1,
    },
    Data: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: 0.7,
        padding: 10,
    },
    Flex_row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
export {EditRecord};
