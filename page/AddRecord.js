import React, {useEffect, useReducer, useRef, useState} from 'react';
import {Animated, PixelRatio, SafeAreaView, ScrollView, StyleSheet, useColorScheme, View} from 'react-native';
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
import DB from '../module/SQLite';

let Rates = 0.86; //匯率變數
const initialState = { //預設狀態
    date: new Date,
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
    remark: ''
};
//更新類型
const [UPDATE_DATE, UPDATE_ORDER_ID, UPDATE_TYPE, UPDATE_CARGO_LETTER,
    UPDATE_CARGO_NUM, UPDATE_CARGO_CHECK_NUM, UPDATE_LOCATION, UPDATE_RMB,
    UPDATE_HKD, UPDATE_ADD, UPDATE_SHIPPING, UPDATE_REMARK] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

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
        default:
            return {
                ...state,
                ...action.payload
            };
    }
};

/* 增加紀錄 */
const AddRecord = () => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const [state, dispatch] = useReducer(reducer, initialState);
    console.log(state);
    const [focusingDecInput, setFocusingDecInput] = useState(null);

    let inputs = {};
    let NumKeyboard_refs = useRef(null);

    /* 對焦到下一個輸入欄 */
    const focusNextField = (id) => {
        console.log('Focus to', id);
        inputs[id].focus();
    };

    /* 對焦金錢輸入欄 => 打開虛擬鍵盤 */
    const DecimalInput_Focus = (id) => {
        console.log('Focus', id)
        hideKeyboard().then(r => null);
        setFocusingDecInput(id);
        NumKeyboard_refs.current.openKeyBoard();
    }

    /* 失焦金錢輸入欄 => 關閉虛擬鍵盤 */
    const DecimalInput_Blur = () => {
        console.log('Blur')
        setFocusingDecInput(null);
        NumKeyboard_refs.current.closeKeyBoard();
    }

    /* 虛擬鍵盤點擊 */
    const onKeyPress = (value) => {
        console.log('input', value)
        if(focusingDecInput){
            if(value === 'back') inputs[focusingDecInput].setText(inputs[focusingDecInput].getText().slice(0, -1)); //刪除最後一個文字
            else if(value === 'done') focusNextField(Object.keys(inputs)[Object.keys(inputs).indexOf(focusingDecInput) + 1]); //完成輸入
            else inputs[focusingDecInput].setText(inputs[focusingDecInput].getText() + value); //輸入文字
        }
    }

    /* 遞交 */
    const submit = () => {
        //todo: check request

        const CargoNum = state.CargoLetter + state.CargoNum + state.CargoCheckNum;

        //check Cargo Num
        if(CargoNumCheck(inputs['CargoLetter']?.getValue(), inputs['CargoNum']?.getValue(), parseInt(inputs['CargoCheckNum']?.getValue()))){ //檢查櫃號
            //通過放入資料庫
            DB.transaction(function(tr){
                tr.executeSql(
                    'INSERT INTO Record (`DateTime`, OrderNum, Type, CargoNum, Local, RMB, HKD, `Add`, Shipping, Remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [moment(state.date).format('yyyy-MM-DD'), state.orderID, state.type, CargoNum, state.local, state.RMB, state.HKD, state.ADD,
                     state.shipping, state.remark]
                );
            }, function(error){
                console.log('傳輸錯誤: ' + error.message); //debug
            }, function(){
                //todo: 紀錄已儲存
            });
        }else{
            //todo: 不通過彈出提醒

        }
    }

    //debug
    useEffect(() => {
        console.log(state);
    })

    /* 地點input */
    const LocalInput = () => {
        const data = ['abcdefg', 'higklmn', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst']; //debug

        const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
        const [autoComplete, setAutoComplete] = useState(data); //自動完成
        const [inputText, setInputText] = useState(state.location);
        const [showList, setShowList] = useState(false);

        /* 文字被更改 */
        const onChange = (text) => {
            setInputText(text);
            setAutoComplete(data); //todo:sql
            //向數據庫取數據
            /*DB.transaction(function(tr){
             tr.executeSql("SELECT DISTINCT Local FROM Record WHERE Local LIKE ? LIMIT 10", ["%" + text + "%"], function(tx, rs){
             if(rs.rows.length <= 0) return;
             for(let i = 0 ; i < rs.rows.length ; i++){
             let val = rs.rows.item().Local

             //插入
             console.log(rs.rows)
             }
             })
             }, function(error){
             console.log('傳輸錯誤: ' + error.message); //debug
             })*/
        }

        /* 完成輸入 */
        const submitEditing = () => {
            dispatch({type: UPDATE_LOCATION, payload: {location: inputText}});
            focusNextField('RMB');
        }

        /* 失去焦點 */
        const blur = () => {
            switchShowList(false);
            dispatch({type: UPDATE_LOCATION, payload: {location: inputText}});
        }

        /* 自動完成 表列文字 */
        const ListText = ({item}) => {
            let wordIndex = item.search(new RegExp(inputText, 'i'));

            let first = item.substring(0, wordIndex);
            let correct = item.substring(wordIndex, wordIndex + inputText.length); //符合文字
            let last = item.substring(wordIndex + inputText.length);

            return (
                <Text>
                    <Text>{first}</Text>
                    <Text style={{color: Color.primaryColor}}>{correct}</Text>
                    <Text>{last}</Text>
                </Text>
            )
        }

        /* 開啟動畫 */
        const fade = useRef(new Animated.Value(0)).current;
        const scale = useRef(new Animated.Value(0.8)).current;

        function switchShowList(setShow){
            if(setShow){
                //開啟
                setShowList(true);
                Animated.timing(fade, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true
                }).start();
                Animated.timing(scale, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true
                }).start();
            }else{
                //關閉
                Animated.timing(fade, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true
                }).start();
                Animated.timing(scale, {
                    toValue: 0.8,
                    duration: 200,
                    useNativeDriver: true
                }).start(() => setShowList(false));
            }
        }

        return (
            <View style={{position: 'relative', flex: 1, height: 38 * PixelRatio.getFontScale()}}>
                <TextInput onChangeText={onChange} value={inputText} autoComplete={'off'} onSubmitEditing={submitEditing} selectTextOnFocus={true} returnKeyType={'next'} onFocus={() => switchShowList(true)} onBlur={blur} ref={(ref) => inputs['local'] = ref}/>
                <Animated.View style={[style.autoComplete, {
                    backgroundColor: isDarkMode ? Color.darkColor : Color.white,
                    opacity: fade,
                    display: showList ? undefined : 'none',
                    transform: [{
                        scale,
                    }]
                }]}>
                    <ScrollView nestedScrollEnabled={true}>
                        {autoComplete.map((data, index) =>
                            <View key={index} style={{flex: 1, marginVertical: 4}}>
                                <ListText item={data}/>
                            </View>
                        )}
                    </ScrollView>
                </Animated.View>
            </View>
        )
    }


    /* Cargo1輸入 */
    const CargoLetterInput = () => {
        return (
            <TextInput style={{
                flex: 1 / 3,
                marginRight: 4
            }} value={state.cargoLetter} placeholder={'AAAA'} returnKeyType={'next'} maxLength={4} onSubmitEditing={(event) => {
                focusNextField('CargoNum');
                dispatch({type: UPDATE_CARGO_LETTER, payload: {cargoLetter: event.text}});
            }} ref={(ref) =>
                inputs['CargoLetter'] = ref
            } render={props =>
                <TextInputMask {...props} selectTextOnFocus={true} mask={'[AAAA]'}/>
            }/>
        );
    }

    /* 日期輸入 */
    const DateSelect = () => {
        return (
            <TextInput caretHidden={true} showSoftInputOnFocus={false} contextMenuHidden={true} onPressOut={() => {
                hideKeyboard().then(r => null);
                DateTimePickerAndroid.open({
                                               value: state.date, onChange: (event, newDate) => {
                        focusNextField('orderID');
                        dispatch({type: UPDATE_DATE, payload: {date: newDate}});
                    }
                                           });
            }} value={moment(state.date).format('D/M/yyyy')}/>
        );
    };

    return (
        <SafeAreaView style={{flex: 1}}>
            <React.StrictMode>
                <ScrollView nestedScrollEnabled={true}>
                    <View style={[style.Data, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>日期</Text>
                            <DateSelect date={state.date} dispatch={dispatch} focusNextField={focusNextField}/>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>單號</Text>
                            <TextInput placeholder={'03/09/020'} keyboardType="numeric" returnKeyType={'next'} maxLength={9} onSubmitEditing={() => focusNextField(
                                'CargoLetter')} ref={(ref) => inputs['orderID'] = ref} render={props =>
                                <TextInputMask {...props} selectTextOnFocus={true} mask={'[00]/[00]/[000]'}/>}/>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>類型</Text>
                            <RadioGroup containerStyle={{
                                justifyContent: 'space-between',
                                flex: 1
                            }} onPress={(value) => dispatch({type: UPDATE_TYPE, payload: {type: value}})}>
                                <RadioButton value={'20'} label={'20'} color={Color.primaryColor}/>
                                <RadioButton value={'40'} label={'40'} color={Color.primaryColor} selected={true}/>
                                <RadioButton value={'45'} label={'45'} color={Color.primaryColor}/>
                            </RadioGroup>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>櫃號</Text>
                            <View style={[{flex: 1}, style.Flex_row]}>
                                <CargoLetterInput/>
                                <TextInput placeholder={'000000'} keyboardType="numeric" returnKeyType={'next'} maxLength={6} onSubmitEditing={() => focusNextField(
                                    'CargoCheckNum')} ref={(ref) => inputs['CargoNum'] = ref} render={props =>
                                    <TextInputMask {...props} mask={'[000000]'}/>}/>
                                <Text>(</Text>
                                <TextInput style={{flex: 1 / 6}} placeholder={'0'} keyboardType="numeric" returnKeyType={'next'} maxLength={1} onSubmitEditing={() => focusNextField(
                                    'local')} ref={(ref) => inputs['CargoCheckNum'] = ref} render={props =>
                                    <TextInputMask {...props} mask={'[0]'}/>}/>
                                <Text>)</Text>
                            </View>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>地點</Text>
                            <LocalInput/>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>人民幣</Text>
                            <View style={[{flex: 1}, style.Flex_row]}>
                                <View style={{flex: 1, marginRight: 4}}>
                                    <DecimalInput ref={(ref) => {inputs['RMB'] = ref;}} containerStyle={{flex: 1}} inputStyle={style.formInput} placeholder={'¥ --'} inputProps={{
                                        showSoftInputOnFocus: false
                                    }} onValueChange={(value) => dispatch({
                                                                              type: UPDATE_RMB,
                                                                              payload: {RMB: value}
                                                                          })} symbol={'¥ '} keyboardRef={NumKeyboard_refs} onFocus={() => DecimalInput_Focus(
                                        'RMB')} onBlur={DecimalInput_Blur}/>
                                    <HelperText>匯率: 1 港幣 = {Rates} 人民幣</HelperText>
                                </View>
                                <Text>折算 HK$ {(state.RMB / Rates).toFixed(2)}</Text>
                            </View>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>港幣</Text>
                            <DecimalInput ref={(ref) => {inputs['HKD'] = ref;}} containerStyle={{flex: 1}} inputStyle={style.formInput} placeholder={'$ --'} inputProps={{
                                showSoftInputOnFocus: false
                            }} onValueChange={(value) => dispatch(
                                {type: UPDATE_HKD, payload: {HKD: value}})} symbol={'$ '} onFocus={() => DecimalInput_Focus(
                                'HKD')} onBlur={DecimalInput_Blur}/>
                        </View>
                        <View style={style.formGroup}>
                            <View style={[{flex: 1 / 2}, style.Flex_row]}>
                                <Text style={{flex: 1 / 2}}>加收</Text>
                                <DecimalInput ref={(ref) => {inputs['ADD'] = ref;}} containerStyle={{flex: 1}} inputStyle={style.formInput} placeholder={'$ --'} inputProps={{
                                    showSoftInputOnFocus: false
                                }} onValueChange={(value) => dispatch(
                                    {type: UPDATE_ADD, payload: {ADD: value}})} symbol={'$ '} onFocus={() => DecimalInput_Focus(
                                    'ADD')} onBlur={DecimalInput_Blur}/>
                            </View>
                            <View style={[{flex: 1 / 2}, style.Flex_row]}>
                                <Text style={{flex: 1 / 2}}>運費</Text>
                                <DecimalInput ref={(ref) => {inputs['shipping'] = ref;}} containerStyle={{flex: 1}} inputStyle={style.formInput} placeholder={'$ --'} inputProps={{
                                    showSoftInputOnFocus: false
                                }} onValueChange={(value) => dispatch(
                                    {type: UPDATE_SHIPPING, payload: {shipping: value}})} symbol={'$ '} onFocus={() => DecimalInput_Focus(
                                    'shipping')} onBlur={DecimalInput_Blur}/>
                            </View>
                        </View>
                    </View>
                    <View style={[style.Remark, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.formGroup, {marginTop: -10}]}>
                            <TextInput ref={(ref) => {inputs['remark'] = ref;}} label={'備註'} selectTextOnFocus={true} returnKeyType={'done'} maxLength={50}/>
                        </View>
                    </View>
                    <View style={[style.Remark, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.Flex_row, {justifyContent: 'space-between'}]}>
                            <Text>合計</Text>
                            <Text style={{
                                color: Color.primaryColor,
                                fontSize: 20
                            }}>HK$ {(state.shipping + state.ADD + state.HKD + state.RMB / Rates).toFixed(2)}</Text>
                        </View>
                        <Button icon={'content-save-outline'} mode={'contained'} onPress={submit}>儲存</Button>
                    </View>
                </ScrollView>
                <NumKeyboard ref={NumKeyboard_refs} onKeyPress={onKeyPress}/>
            </React.StrictMode>
        </SafeAreaView>
    )
}

const style = StyleSheet.create({
    formGroup: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,

    },
    autoComplete: {
        flex: 1,
        maxHeight: 200,
        width: '90%',
        position: 'absolute',
        top: '100%',
        elevation: 5,
        zIndex: 5,
        borderRadius: 10,
        padding: 5,
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
        padding: 10,
    },
    Flex_row: {
        flexDirection: 'row',
        alignItems: 'center'
    }
})
export {AddRecord};