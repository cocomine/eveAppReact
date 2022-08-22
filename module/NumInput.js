import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Animated, StyleSheet, TouchableNativeFeedback, useColorScheme, View,} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import {Color} from "./Color";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {TouchableNativeFeedbackPresets} from "./styles";
import {Text, TextInput, useTheme} from "react-native-paper";


/* 小數輸入 */
const DecimalInput = forwardRef(({
                                     symbol = '',
                                     value = '',
                                     inputStyle,
                                     containerStyle,
                                     inputProps = {},
                                     placeholder = '',
                                     onValueChange = () => {},
                                     onFocus = () => null,
                                     onBlur = () => null
                                 }, ref) => {
    const inputRef = useRef();
    const [displayValue, setDisplayValue] = useState('');
    const [real_value, setReal_value] = useState('');
    const [isFocus, setFocus] = useState(false);

    /* 文字更改 */
    const onChange = (value) => {
        if(value.toString().length <= 0) return;
        //過濾文字
        let text = value.toString().split('');
        text = text.filter((char) => /[0-9]|-|\./.test(char));

        //處理小數點 -> 只允許一個小數點
        const dote_index = text.indexOf('.')
        text = text.filter((char) => !/\./.test(char)); //移除所有小數點
        if(dote_index > 0) text.splice(dote_index, 0, '.'); //放回小數點

        //處理負數
        const isNegative = text.includes('-');
        text = text.filter((char) => !/-/.test(char)); //移除所有負數符號

        //分隔銀碼
        text = text.join(''); //合併回完整字串
        const digits = text.split('.'); //將小數分開
        const intDigits = digits[0].split(''); // 整數的部分切割成陣列
        const groupDigits = [];
        while(intDigits.length > 3) groupDigits.unshift(intDigits.splice(intDigits.length - 3, 3).join(''));// 當數字足夠，從後面取出三個位數，轉成字串塞回 groupDigits
        groupDigits.unshift(intDigits.join('')); //將剩餘嘅放回前面
        digits[0] = groupDigits.join(','); //合併
        value = digits.join("."); //合併回完整字串

        if(isNegative) value = '-' + value; //前面加負數符號

        const real_value = value.replaceAll(',', ''); //轉換為浮點數類型
        inputRef.current.setNativeProps({text: real_value}); //覆寫真正的輸入欄
        if(value.length > 0) value = symbol + value; //加上符號

        setDisplayValue(value);
        setReal_value(real_value);
        onValueChange(parseFloat(real_value) || 0);
    }

    const focus = () => {
        setFocus(true);
        onFocus();
    };
    const blur = () => {
        setFocus(false);
        onBlur();
    };

    /* 套用預設文字 */
    useEffect(() => {
        onChange(value);
    }, [])

    /* ref function */
    useImperativeHandle(ref, () => ({
        //輸入文字
        setText: (text) => {
            onChange(text);
        },
        getText: () => {
            return real_value;
        },
        focus: () => {
            inputRef.current.focus();
            focus();
        },
        blur: () => {
            inputRef.current.blur();
            blur();
        }
    }));

    return (
        <View style={[containerStyle, {position: 'relative'}]}>
            <TextInput style={style.inputStyle} value={displayValue} placeholder={placeholder} dense={true} underlineColor={isFocus ? Color.primaryColor : undefined}/>
            <TextInput {...inputProps} ref={inputRef} style={style.coverInput} keyboardType='numeric' defaultValue={value} onChangeText={onChange} dense={true} onFocus={focus} onBlur={blur}/>
        </View>
    );
});

/* 整數輸入 */
const NumberInput = ({
                         symbol = '',
                         value = '',
                         inputStyle,
                         containerStyle,
                         inputProps = {},
                         placeholder = '',
                         onValueChange = () => {}
                     }) => {
    const inputRef = useRef();
    const [displayValue, setDisplayValue] = useState(value);

    const onChange = (value) => {
        //過濾文字
        let text = value.split('');
        text = text.filter((char) => /[0-9]|-/.test(char));

        //處理負數
        const isNegative = text.includes('-');
        text = text.filter((char) => !/-/.test(char)); //移除所有負數符號

        //分隔銀碼
        const groupDigits = [];
        while(text.length > 3) groupDigits.unshift(text.splice(text.length - 3, 3).join(''));// 當數字足夠，從後面取出三個位數，轉成字串塞回 groupDigits
        groupDigits.unshift(text.join('')); //將剩餘嘅放回前面
        text = groupDigits.join(','); //合併回完整字串

        if(isNegative) text = '-' + text; //前面加負數符號

        const real_value = parseInt(text.replaceAll(',', '')); //轉換為浮點數類型
        inputRef.current.setNativeProps({text: text.replaceAll(',', '')}); //覆寫真正的輸入欄
        if(text.length > 0) text = symbol + " " + text; //加上符號

        setDisplayValue(text);
        onValueChange(real_value || 0);
    }

    return (
        <View style={[containerStyle, {position: 'relative'}]}>
            <TextInput style={inputStyle} value={displayValue} placeholder={placeholder}/>
            <TextInput {...inputProps} ref={inputRef} style={style.coverInput} keyboardType='numeric' defaultValue={value} onChangeText={onChange} selectTextOnFocus={true}/>
        </View>
    );
}

/* 數字鍵盤 */
const NumKeyboard = forwardRef(({onKeyPress = () => {}}, ref) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const {colors} = useTheme();
    let isOpen = false;

    /* 鍵盤點擊 */
    const onPress = (value) => {
        onKeyPress(value)
    }

    /* ref function */
    useImperativeHandle(ref, () => ({
        //打開鍵盤
        openKeyBoard: () => {
            isOpen = true;
            //todo
        },
        //關閉鍵盤
        closeKeyBoard: () => {
            isOpen = false;
            //todo
        }
    }));

    return (
        <Animated.View style={{height: 220}}>
            <View style={[style.row, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('1')}><View style={style.button}><Text style={style.text}>1</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('2')}><View style={style.button}><Text style={style.text}>2</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('3')}><View style={style.button}><Text style={style.text}>3</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('back')}><View style={style.button}><Feather name={'delete'} style={style.text} color={colors.text}/></View></TouchableNativeFeedback>
            </View>
            <View style={[style.row, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('4')}><View style={style.button}><Text style={style.text}>4</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('5')}><View style={style.button}><Text style={style.text}>5</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('6')}><View style={style.button}><Text style={style.text}>6</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('-')}><View style={style.button}><Text style={style.text}>-</Text></View></TouchableNativeFeedback>
            </View>
            <View style={[style.row, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('7')}><View style={style.button}><Text style={style.text}>7</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('8')}><View style={style.button}><Text style={style.text}>8</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('9')}><View style={style.button}><Text style={style.text}>9</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => {}}><View style={style.button}><Ionicons name={'ios-calculator'} style={style.text} color={colors.text}/></View></TouchableNativeFeedback>
            </View>
            <View style={[style.row, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('00')}><View style={style.button}><Text style={style.text}>00</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('0')}><View style={style.button}><Text style={style.text}>0</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('.')}><View style={style.button}><Text style={style.text}>.</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('done')}><View style={style.button}><MaterialIcons name={'done'} style={style.text} colors={colors.text}/></View></TouchableNativeFeedback>
            </View>
        </Animated.View>
    )
})

export {DecimalInput, NumberInput, NumKeyboard}

const style = StyleSheet.create({
    inputStyle: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    coverInput: {
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 0,
        right: 0,
        bottom: 0,
        color: 'transparent'
    },
    row: {
        flex: 1,
        flexDirection: "row",
        borderTopWidth: .7,
        borderColor: Color.darkColorLight
    },
    button: {
        flex: 1,
        borderRightWidth: .7,
        borderColor: Color.darkColorLight,
        justifyContent: 'center',
    },
    text: {
        textAlign: 'center',
        fontSize: 20,
    },
})