import React, {useRef, useState} from 'react';
import {Animated, PixelRatio, SafeAreaView, ScrollView, StyleSheet, useColorScheme, View} from "react-native";
import moment from "moment";
import {Color} from "../module/Color";
import {DateTimePickerAndroid} from "@react-native-community/datetimepicker";
import {SmailText} from "../module/styles";
import Feather from "react-native-vector-icons/Feather";
import {DecimalInput, NumKeyboard} from "../module/NumInput";
import {RadioButton, RadioGroup} from "../module/RadioButton";
import TextInput from "../module/TextInput";
import {Text} from "react-native-paper";

let Rates = 0.86; //匯率變數

/* 增加紀錄 */
const AddRecord = () => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const [date, setDate] = useState(new Date())
    const [type, setType] = useState(20)
    const [RMB, setRMB] = useState(0);
    const [HKD, setHKD] = useState(0);
    const [ADD, setADD] = useState(0);
    const [shipping, setShipping] = useState(0);
    const [focusingDecInput, setFocusingDecInput] = useState(null);

    let inputs = {}
    let NumKeyboard_refs = useRef(null);
    const focusNextField = (id) => {
        console.log('Focus to', id)
        inputs[id].focus();
        //todo
    }
    const DecimalInput_Focus = (id) => {
        console.log('Focus', id)
        setFocusingDecInput(id);
        NumKeyboard_refs.current.openKeyBoard();
    }
    const DecimalInput_Blur = () => {
        console.log('Blur')
        setFocusingDecInput(null);
        NumKeyboard_refs.current.closeKeyBoard();
    }
    const onKeyPress = (value) => {
        console.log('input', value)
        console.log('focusingInput', focusingDecInput)
        console.log('inputs', Object.keys(inputs))
        console.log('inputs', inputs)
        if(focusingDecInput){
            if(value === 'back') inputs[focusingDecInput].setText(inputs[focusingDecInput].getText().slice(0, -1)); //刪除最後一個文字
            else if(value === 'done') focusNextField(Object.keys(inputs)[Object.keys(inputs).indexOf(focusingDecInput) + 1]); //完成輸入
            else inputs[focusingDecInput].setText(inputs[focusingDecInput].getText() + value); //輸入文字
        }
    }

    /* 地點input */
    const LocalInput = () => {
        const data = ['abcdefg', 'higklmn', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst', 'opqrst']; //debug

        const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
        const [autoComplete, setAutoComplete] = useState(data); //自動完成
        const [inputText, setInputText] = useState('');
        const [showList, setShowList] = useState(false);

        /* 文字被更改 */
        function onChange(text){
            setInputText(text);
            setAutoComplete(data)
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
                <TextInput style={style.formInput} onChangeText={onChange} autoComplete={'off'} selectTextOnFocus={true} returnKeyType={'next'} onFocus={() => switchShowList(true)} onBlur={() => switchShowList(false)} ref={(ref) => {inputs['local'] = ref}}/>
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

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: isDarkMode ? Color.darkColor : Color.light}}>
            <React.StrictMode>
                <ScrollView nestedScrollEnabled={true}>
                    <View style={[style.Data, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>日期</Text>
                            <Text style={style.formInput} onPress={() => DateTimePickerAndroid.open({
                                value: date,
                                onChange: (event, date) => {
                                    setDate(date);
                                    focusNextField('orderID')
                                }
                            })}>{moment(date).format("D/M/yyyy")}</Text>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>單號</Text>
                            <TextInput placeholder={"03/09/020"} selectTextOnFocus={true} returnKeyType={'next'} maxLength={9} ref={inputs['orderID']}/>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>類型</Text>
                            <RadioGroup containerStyle={{
                                justifyContent: 'space-between',
                                flex: 1
                            }} onPress={(value) => setType(value)}>
                                <RadioButton value={'20'} label={'20'} color={Color.primaryColor} selected={true}/>
                                <RadioButton value={'40'} label={'40'} color={Color.primaryColor}/>
                                <RadioButton value={'45'} label={'45'} color={Color.primaryColor}/>
                            </RadioGroup>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>櫃號</Text>
                            <View style={[{flex: 1}, style.Flex_row]}>
                                <TextInput style={{
                                    flex: 1 / 3,
                                    marginRight: 4
                                }} placeholder={"FSCU"} selectTextOnFocus={true} returnKeyType={'next'} maxLength={4} ref={inputs['cargo1']} borderColor={Color.darkColorLight} focusBorderColor={Color.primaryColor}/>
                                <TextInput placeholder={"512883"} selectTextOnFocus={true} returnKeyType={'next'} maxLength={6} ref={inputs['cargo2']} borderColor={Color.darkColorLight} focusBorderColor={Color.primaryColor}/>
                                <Text>(</Text>
                                <TextInput style={{flex: 1 / 6}} placeholder={"7"} selectTextOnFocus={true} returnKeyType={'next'} maxLength={1} ref={inputs['cargo3']} borderColor={Color.darkColorLight} focusBorderColor={Color.primaryColor}/>
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
                                <View style={{flex: 1, height: 53 * PixelRatio.getFontScale()}}>
                                    <DecimalInput ref={(ref) => {inputs['RMB'] = ref}} containerStyle={{flex: 1}} inputStyle={style.formInput} placeholder={"¥ --"} inputProps={{
                                        selectTextOnFocus: true,
                                        returnKeyType: 'next',
                                        showSoftInputOnFocus: false,
                                    }} onValueChange={(value) => setRMB(value)} symbol={'¥ '} keyboardRef={NumKeyboard_refs} onFocus={() => DecimalInput_Focus('RMB')} onBlur={DecimalInput_Blur}/>
                                    <SmailText>匯率: 1 港幣 = {Rates} 人民幣</SmailText>
                                </View>
                                <Text>折算 HK$ {(RMB / Rates).toFixed(2)}</Text>
                            </View>
                        </View>
                        <View style={style.formGroup}>
                            <Text style={{flex: 1 / 5}}>港幣</Text>
                            <DecimalInput ref={(ref) => {inputs['HKD'] = ref}} containerStyle={{flex: 1}} inputStyle={style.formInput} placeholder={"$ --"} inputProps={{
                                selectTextOnFocus: true,
                                returnKeyType: 'next',
                                showSoftInputOnFocus: false,
                            }} onValueChange={(value) => setHKD(value)} symbol={'$ '} onFocus={() => DecimalInput_Focus('HKD')} onBlur={DecimalInput_Blur}/>
                        </View>
                        <View style={style.formGroup}>
                            <View style={[{flex: 1 / 2}, style.Flex_row]}>
                                <Text style={{flex: 1 / 2}}>加收</Text>
                                <DecimalInput ref={(ref) => {inputs['ADD'] = ref}} containerStyle={{flex: 1}} inputStyle={style.formInput} placeholder={"$ --"} inputProps={{
                                    selectTextOnFocus: true,
                                    returnKeyType: 'next',
                                    showSoftInputOnFocus: false,
                                }} onValueChange={(value) => setADD(value)} symbol={'$ '} onFocus={() => DecimalInput_Focus('ADD')} onBlur={DecimalInput_Blur}/>
                            </View>
                            <View style={[{flex: 1 / 2}, style.Flex_row]}>
                                <Text style={{flex: 1 / 2}}>運費</Text>
                                <DecimalInput ref={(ref) => {inputs['shipping'] = ref}} containerStyle={{flex: 1}} inputStyle={style.formInput} placeholder={"$ --"} inputProps={{
                                    selectTextOnFocus: true,
                                    returnKeyType: 'next',
                                    showSoftInputOnFocus: false,
                                }} onValueChange={(value) => setShipping(value)} symbol={'$ '} onFocus={() => DecimalInput_Focus('shipping')} onBlur={DecimalInput_Blur}/>
                            </View>
                        </View>
                    </View>
                    <View style={[style.Remark, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.formGroup, {marginTop: 0}]}>
                            <TextInput style={{paddingTop: 0}} placeholder={"備註"} selectTextOnFocus={true} returnKeyType={'done'} maxLength={50} borderColor={Color.darkColorLight} focusBorderColor={Color.primaryColor}/>
                        </View>
                    </View>
                    <View style={[style.Remark, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                        <View style={[style.Flex_row, {justifyContent: 'space-between'}]}>
                            <Text>合計</Text>
                            <Text style={{
                                color: Color.primaryColor,
                                fontSize: 20
                            }}>HK$ {(shipping + ADD + HKD + RMB / Rates).toFixed(2)}</Text>
                        </View>
                        <Feather.Button name={'save'} backgroundColor={Color.primaryColor} style={{justifyContent: 'center'}} onPress={() => {}}>
                            <Text style={{color: Color.white}}>儲存</Text>
                        </Feather.Button>
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
    formInput: {
        flex: 1,
        borderColor: Color.darkColorLight,
        borderBottomWidth: .7,
        borderStyle: 'solid',
        padding: 5,
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