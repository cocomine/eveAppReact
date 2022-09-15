import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {BackHandler, SafeAreaView, ScrollView, StatusBar, StyleSheet, useColorScheme, View} from 'react-native';
import moment from 'moment';
import {Color} from '../module/Color';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {DecimalInput, NumKeyboard} from '../module/NumInput';
import TextInput from '../module/TextInput';
import {Button, HelperText, Text} from 'react-native-paper';
import TextInputMask from 'react-native-text-input-mask';
import {RadioButton, RadioGroup} from '../module/RadioButton';
import {hideKeyboard} from 'react-native-hide-keyboard/src';
import CargoNumCheck from '../module/CargoNumCheck';
import {DB, useSetting} from '../module/SQLite';
import ErrorHelperText from '../module/ErrorHelperText';
import {LocalInput} from './AddRecord';
import AsyncStorage from '@react-native-async-storage/async-storage';

//預設狀態
const initialState = {
    date: new Date(),
    orderID: '',
    type: '40',
    cargoLetter: '',
    cargoNum: '',
    cargoCheckNum: '',
    location: '',
    RMB: 0,
    HKD: 0,
    ADD: 0,
    shipping: 0,
    remark: '',
    error: {
        cargo: null,
        location: null,
        orderID: null
    }
};
//更新類型
const [UPDATE_DATE, UPDATE_ORDER_ID, UPDATE_TYPE, UPDATE_CARGO_LETTER,
    UPDATE_CARGO_NUM, UPDATE_CARGO_CHECK_NUM, UPDATE_LOCATION, UPDATE_RMB,
    UPDATE_HKD, UPDATE_ADD, UPDATE_SHIPPING, UPDATE_REMARK,
    SET_ERROR] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/* 更新處理器 */
const reducer = (state, action) => {
    switch(action.type){
        case UPDATE_DATE:
            return {
                ...state,
                date: action.payload.date
            };
        case UPDATE_ORDER_ID:
            return {
                ...state,
                orderID: action.payload.orderID
            };
        case UPDATE_TYPE:
            return {
                ...state,
                type: action.payload.type
            };
        case UPDATE_CARGO_LETTER:
            return {
                ...state,
                cargoLetter: action.payload.cargoLetter
            };
        case UPDATE_CARGO_NUM:
            return {
                ...state,
                cargoNum: action.payload.cargoNum
            };
        case UPDATE_CARGO_CHECK_NUM:
            return {
                ...state,
                cargoCheckNum: action.payload.cargoCheckNum
            };
        case UPDATE_LOCATION:
            return {
                ...state,
                location: action.payload.location
            };
        case UPDATE_RMB:
            return {
                ...state,
                RMB: action.payload.RMB
            };
        case UPDATE_HKD:
            return {
                ...state,
                HKD: action.payload.HKD
            };
        case UPDATE_ADD:
            return {
                ...state,
                ADD: action.payload.ADD
            };
        case UPDATE_SHIPPING:
            return {
                ...state,
                shipping: action.payload.shipping
            };
        case UPDATE_REMARK:
            return {
                ...state,
                remark: action.payload.remark
            };
        case SET_ERROR:
            return {
                ...state,
                error: {
                    ...action.payload.error
                }
            };
        default:
            return {
                ...state,
                ...action.payload
            };
    }
};

/* 增加紀錄 */
const EditRecord = ({navigation, route}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const [state, dispatch] = useReducer(reducer, initialState); //輸入資料
    const [recordID] = useState(route.params.recordID); //recordID
    const focusingDecInput = useRef(null); //目前聚焦銀碼輸入框
    const [setting] = useSetting(); //設定
    const Rate = parseFloat(setting ? setting.Rate : 0);

    //textInput refs
    let inputs = useRef({
        orderID: null,
        CargoLetter: null,
        CargoNum: null,
        CargoCheckNum: null,
        local: null,
        RMB: null,
        HKD: null,
        ADD: null,
        shipping: null,
        remark: null
    });
    let NumKeyboard_refs = useRef(null);

    /* 對焦到下一個輸入欄 */
    const focusNextField = useCallback((id) => {
        inputs.current[id].focus();
    }, []);

    /* 對焦金錢輸入欄 => 打開虛擬鍵盤 */
    const DecimalInput_Focus = useCallback((id) => {
        hideKeyboard().then();
        focusingDecInput.current = id;
        NumKeyboard_refs.current.openKeyBoard();
    }, []);

    /* 失焦金錢輸入欄 => 關閉虛擬鍵盤 */
    const DecimalInput_Blur = useCallback(() => {
        focusingDecInput.current = null;
        NumKeyboard_refs.current.closeKeyBoard();
    }, []);

    /* 虛擬鍵盤點擊 */
    const onKeyPress = useCallback((value) => {
        if(focusingDecInput.current){
            if(value === 'back') inputs.current[focusingDecInput.current].setText(inputs.current[focusingDecInput.current].getText().slice(0, -1)); //刪除最後一個文字
            else if(value === 'done') focusNextField(Object.keys(inputs.current)[Object.keys(inputs.current).indexOf(focusingDecInput.current) + 1]); //完成輸入
            else if(value === 'calculator') navigation.navigate('calculator', {inputID: focusingDecInput.current, pageID: route.name}); //跳轉到計算機
            else inputs.current[focusingDecInput.current].setText(inputs.current[focusingDecInput.current].getText() + value); //輸入文字
        }
    }, []);

    /* 遞交 */
    const submit = useCallback(() => {
        let error = {
            cargo: null,
            location: null,
            orderID: null
        };

        //檢查條件
        if(state.orderID.length > 0 && state.orderID.length < 9){
            error.orderID = '未完成填寫';
        }
        if(state.cargoLetter.length <= 0 || state.cargoNum.length <= 0 || state.cargoCheckNum.length <= 0){
            error.cargo = '必須填寫';
        }else if(state.cargoLetter.length < 4 || state.cargoNum.length < 6 || state.cargoCheckNum.length < 1){
            error.cargo = '未完成填寫';
        }else if(!CargoNumCheck(state.cargoLetter, state.cargoNum, parseInt(state.cargoCheckNum))){
            error.cargo = '填寫錯誤';
        }
        if(state.location.length <= 0){
            error.location = '必須填寫';
        }

        dispatch({type: SET_ERROR, payload: {error: {...error}}});
        if(Object.values(error).findIndex((value) => value !== null) >= 0) return; //是否全部已通過

        //通過更新資料庫
        const CargoNum = state.cargoLetter + state.cargoNum + state.cargoCheckNum;
        DB.transaction(function(tr){
            tr.executeSql(
                'UPDATE Record SET `DateTime` = ?, OrderNum = ?, Type = ?, CargoNum = ?, Local = ?, RMB = ?, HKD = ?, `Add` = ?, Shipping = ?, Remark = ? WHERE RecordID = ?',
                [moment(state.date).format('yyyy-MM-DD'), state.orderID, state.type,
                 CargoNum, state.location, state.RMB, state.HKD, state.ADD, state.shipping, state.remark, recordID]
            );
        }, function(error){
            console.log('傳輸錯誤: ' + error.message); //debug
        }, function(){
            navigation.navigate('Main', {ShowDay: state.date.toString()}); //go back home
        });
    }, [state]);

    /* 複製 */
    const copy = useCallback(() => {
        const storeDraft = async() => {
            try{
                let draft = JSON.stringify(state);
                await AsyncStorage.setItem('Draft', draft);
            }catch(e){
                console.log('Save Daft error: ', e);
            }
        };

        //儲存後跳轉頁面
        storeDraft().then(() => navigation.replace('AddRecord'));
    }, [navigation, state]);

    //debug
    /*useEffect(() => {
     console.log(state);
     });*/

    /* route 處理 */
    useEffect(() => {
        if(route.params){
            //計算機返回輸入欄位id
            if(route.params.value && route.params.inputID){
                inputs.current[route.params.inputID].setText(route.params.value.toString());
            }
            //取得紀錄
            if(route.params.recordID){
                DB.transaction(function(tr){
                    console.log('顯示: ', route.params.recordID); //debug
                    tr.executeSql('SELECT * FROM Record WHERE RecordID = ?', [route.params.recordID], function(tx, rs){
                        const row = rs.rows.item(0);
                        dispatch({
                            payload: {
                                date: new Date(row.DateTime),
                                orderID: row.OrderNum,
                                type: row.Type,
                                cargoLetter: row.CargoNum.slice(0, 4),
                                cargoNum: row.CargoNum.slice(4, 10),
                                cargoCheckNum: row.CargoNum.slice(10),
                                location: row.Local,
                                RMB: row.RMB,
                                HKD: row.HKD,
                                ADD: row.Add,
                                shipping: row.Shipping,
                                remark: row.Remark
                            }
                        });
                    }, function(tx, error){
                        console.log('取得資料錯誤: ' + error.message);
                    });
                }, function(error){
                    console.log('傳輸錯誤: ' + error.message);
                }, function(){
                    console.log('已取得資料');
                });
            }
        }
    }, [route]);

    /* 處理返回按鈕 */
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if(focusingDecInput.current !== null){ //打開了自定義數字鍵盤行為
                inputs.current[focusingDecInput.current].blur();
                return true;
            }
        });

        //清除活動監聽器
        return () => backHandler.remove();
    }, [focusingDecInput]);

    return (
        <SafeAreaView style={{flex: 1}}>
            <StatusBar backgroundColor={Color.primaryColor} barStyle={'light-content'} animated={true}/>
            {/*<React.StrictMode>*/}
            <ScrollView nestedScrollEnabled={true}>
                <View style={[style.Data, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                    {/* 日期 */}
                    <View style={style.formGroup}>
                        <Text style={{flex: 1 / 5}}>日期</Text>
                        <TextInput caretHidden={true} showSoftInputOnFocus={false} contextMenuHidden={true} onPressOut={() => {
                            hideKeyboard().then();
                            DateTimePickerAndroid.open({
                                value: state.date, onChange: (event, newDate) => {
                                    focusNextField('orderID');
                                    dispatch({type: UPDATE_DATE, payload: {date: newDate}});
                                }
                            });
                        }} value={moment(state.date).format('D/M/yyyy')} style={{flex: 1}}/>
                        </View>
                        {/* 單號 */}
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>單號</Text>
                            <View style={{flex: 1}}>
                                <TextInput placeholder={'03/09/020'} keyboardType="numeric" returnKeyType={'next'} maxLength={9}
                                           onSubmitEditing={() => focusNextField('CargoLetter')} ref={(ref) => inputs.current.orderID = ref}
                                           onBlur={(text) => dispatch({type: UPDATE_ORDER_ID, payload: {orderID: text}})}
                                           render={props => <TextInputMask {...props} mask={'[00]/[00]/[000]'}/>}
                                           error={state.error.orderID !== null} value={state.orderID}
                                />
                                <ErrorHelperText visible={state.error.orderID !== null}>{state.error.orderID}</ErrorHelperText>
                            </View>
                        </View>
                        {/* 類型 */}
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>類型</Text>
                            <RadioGroup containerStyle={{justifyContent: 'space-between', flex: 1}} selectValue={state.type}
                                        onPress={(value) => dispatch({type: UPDATE_TYPE, payload: {type: value}})}>
                                <RadioButton value={'20'} label={'20'} color={Color.primaryColor} selected={state.type === '20'}/>
                                <RadioButton value={'40'} label={'40'} color={Color.primaryColor} selected={state.type === '40'}/>
                                <RadioButton value={'45'} label={'45'} color={Color.primaryColor} selected={state.type === '45'}/>
                            </RadioGroup>
                        </View>
                        {/* 櫃號 */}
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>櫃號</Text>
                            <View style={[{flex: 1}, style.Flex_row]}>
                                <View style={{flex: 1 / 2, marginRight: 4}}>
                                    <TextInput error={state.error.cargo !== null} value={state.cargoLetter}
                                               placeholder={'AAAA'} returnKeyType={'next'} maxLength={4}
                                               onSubmitEditing={() => focusNextField('CargoNum')}
                                               ref={(ref) => inputs.current.CargoLetter = ref}
                                               onBlur={(text) => {dispatch({type: UPDATE_CARGO_LETTER, payload: {cargoLetter: text.toUpperCase()}});}}
                                               render={props => <TextInputMask {...props} selectTextOnFocus={true} mask={'[AAAA]'}/>}
                                    />
                                    <ErrorHelperText visible={state.error.cargo !== null}>{state.error.cargo}</ErrorHelperText>
                                </View>
                                <View style={{flex: 1, marginRight: 4}}>
                                    <TextInput placeholder={'000000'} keyboardType="numeric" returnKeyType={'next'}
                                               maxLength={6} error={state.error.cargo !== null} value={state.cargoNum}
                                               onSubmitEditing={() => focusNextField('CargoCheckNum')}
                                               onBlur={(text) => {dispatch({type: UPDATE_CARGO_NUM, payload: {cargoNum: text}});}}
                                               ref={(ref) => inputs.current.CargoNum = ref}
                                               render={props => <TextInputMask {...props} mask={'[000000]'}/>}
                                    />
                                    <ErrorHelperText visible={state.error.cargo !== null}>{}</ErrorHelperText>
                                </View>
                                <Text>(</Text>
                                <View style={{flex: 1 / 4}}>
                                    <TextInput placeholder={'0'} keyboardType="numeric" returnKeyType={'next'} value={state.cargoCheckNum}
                                               maxLength={1} error={state.error.cargo !== null} style={{textAlign: 'center', marginHorizontal: 2}}
                                               onSubmitEditing={() => focusNextField('local')}
                                               onBlur={(text) => {dispatch({type: UPDATE_CARGO_CHECK_NUM, payload: {cargoCheckNum: text}});}}
                                               ref={(ref) => inputs.current.CargoCheckNum = ref}
                                               render={props => <TextInputMask {...props} mask={'[0]'}/>}
                                    />
                                    <ErrorHelperText visible={state.error.cargo !== null}>{}</ErrorHelperText>
                                </View>
                                <Text>)</Text>
                            </View>
                        </View>
                        {/* 地點 */}
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>地點</Text>
                            <LocalInput ref={(ref) => {inputs.current.local = ref;}} value={state.location}
                                        onBlur={(text) => dispatch({type: UPDATE_LOCATION, payload: {location: text}})}
                                        onSubmitEditing={() => focusNextField('RMB')} error={state.error.location}
                            />
                        </View>
                        {/* 人民幣 */}
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>人民幣</Text>
                            <View style={[{flex: 1}, style.Flex_row]}>
                                <View style={{flex: 1, marginRight: 4}}>
                                    <DecimalInput ref={(ref) => {inputs.current.RMB = ref;}} containerStyle={{flex: 1}}
                                                  inputStyle={style.formInput} placeholder={'¥ --'} inputProps={{showSoftInputOnFocus: false}}
                                                  onValueChange={(value) => dispatch({type: UPDATE_RMB, payload: {RMB: value}})}
                                                  symbol={'¥ '} keyboardRef={NumKeyboard_refs} onFocus={() => DecimalInput_Focus('RMB')}
                                                  onBlur={DecimalInput_Blur} value={state.RMB}
                                    />
                                    <HelperText>匯率: 1 港幣 = {Rate} 人民幣</HelperText>
                                </View>
                                <Text>折算 HK$ {(state.RMB / Rate).toFixed(2)}</Text>
                            </View>
                        </View>
                        {/* 港幣 */}
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>港幣</Text>
                            <DecimalInput ref={(ref) => {inputs.current.HKD = ref;}} containerStyle={{flex: 1}} value={state.HKD}
                                          inputStyle={style.formInput} placeholder={'$ --'} inputProps={{showSoftInputOnFocus: false}}
                                          onValueChange={(value) => dispatch({type: UPDATE_HKD, payload: {HKD: value}})}
                                          symbol={'$ '} onFocus={() => DecimalInput_Focus('HKD')} onBlur={DecimalInput_Blur}
                            />
                        </View>
                        {/* 加收&運費 */}
                        <View style={style.formGroup}>
                            <View style={[{flex: 1 / 2}, style.Flex_row]}>
                                <Text style={{flex: 1 / 2}}>加收</Text>
                                <DecimalInput ref={(ref) => {inputs.current.ADD = ref;}} containerStyle={{flex: 1}} value={state.ADD}
                                              inputStyle={style.formInput} placeholder={'$ --'} inputProps={{showSoftInputOnFocus: false}}
                                              onValueChange={(value) => dispatch({type: UPDATE_ADD, payload: {ADD: value}})}
                                              symbol={'$ '} onFocus={() => DecimalInput_Focus('ADD')} onBlur={DecimalInput_Blur}
                                />
                            </View>
                            <View style={[{flex: 1 / 2}, style.Flex_row]}>
                                <Text style={{flex: 1 / 2}}>運費</Text>
                                <DecimalInput ref={(ref) => {inputs.current.shipping = ref;}} containerStyle={{flex: 1}} value={state.shipping}
                                              inputStyle={style.formInput} placeholder={'$ --'} inputProps={{showSoftInputOnFocus: false}}
                                              onValueChange={(value) => dispatch({type: UPDATE_SHIPPING, payload: {shipping: value}})}
                                              symbol={'$ '} onFocus={() => DecimalInput_Focus('shipping')} onBlur={DecimalInput_Blur}
                                />
                            </View>
                        </View>
                    </View>
                    {/* 備註 */}
                    <View style={[style.Remark, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.formGroup, {marginTop: -10}]}>
                            <TextInput ref={(ref) => {inputs.current.remark = ref;}} label={'備註'} returnKeyType={'done'} maxLength={50}
                                       value={state.remark} onChangeText={(text) => dispatch({type: UPDATE_REMARK, payload: {remark: text}})}
                                       style={{flex: 1}}
                            />
                        </View>
                    </View>
                    {/* 儲存 */}
                    <View style={[style.Remark, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.Flex_row, {justifyContent: 'space-between'}]}>
                            <Text>合計</Text>
                            <Text style={{color: Color.primaryColor, fontSize: 20}}>
                                HK$ {(state.shipping + state.ADD + state.HKD + state.RMB / Rate).toFixed(2)}
                            </Text>
                        </View>
                        <View style={{flexDirection: 'row'}}>
                            <Button icon={'content-copy'} mode={'outlined'} onPress={copy} style={{flex: 1, marginRight: 5}}>複製</Button>
                            <Button icon={'content-save-outline'} mode={'contained'} onPress={submit} style={{flex: 1}}>更新</Button>
                        </View>

                    </View>
                </ScrollView>
                <NumKeyboard ref={NumKeyboard_refs} onKeyPress={onKeyPress}/>
            {/*</React.StrictMode>*/}
        </SafeAreaView>
    );
};

const style = StyleSheet.create({
    formGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5
    },
    Remark: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: .7,
        borderTopWidth: .7,
        marginTop: 10,
        padding: 10,
        elevation: -1
    },
    Data: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: .7,
        padding: 10
    },
    Flex_row: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});
export {EditRecord};