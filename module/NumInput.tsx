import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {
    Animated,
    StyleProp,
    StyleSheet,
    TextInput as NativeTextInput,
    TextStyle,
    TouchableNativeFeedback,
    useColorScheme,
    View,
    ViewStyle,
} from "react-native";
import {Color} from "./Color";
import {TouchableNativeFeedbackPresets} from "./styles";
import {IconButton, Text, TextInput, TextInputProps, useTheme} from "react-native-paper";

/* 輸入參數 */
interface InputProps {
    symbol?: string,
    value?: string | number,
    inputStyle?: StyleProp<TextStyle>,
    containerStyle?: StyleProp<ViewStyle>,
    inputProps?: TextInputProps,
    placeholder?: string,
    onValueChange?: (value: number) => void,
    onFocus?: () => void,
    onBlur?: () => void
}

/* 參考方法 */
type InputRef = {
    setText: (text: string) => void,
    getText: () => string,
    focus: () => void,
    blur: () => void
}

/* 介面 */
interface InputComponent extends React.ForwardRefExoticComponent<InputProps & React.RefAttributes<InputRef>> {
    setText: (text: string) => void,
    getText: () => string,
    focus: () => void,
    blur: () => void
}

/* 小數輸入 */
const DecimalInput = forwardRef<InputRef, InputProps>(({
                                                           symbol = '',
                                                           value = '',
                                                           inputStyle,
                                                           containerStyle,
                                                           inputProps = {},
                                                           placeholder = '',
                                                           onValueChange = () => {
                                                           },
                                                           onFocus = () => null,
                                                           onBlur = () => null
                                                       }, ref) => {
    const inputRef = useRef<NativeTextInput | null>(null);
    const [displayValue, setDisplayValue] = useState('');
    const [real_value, setReal_value] = useState('');
    const [isFocus, setFocus] = useState(false);

    /* 文字更改 */
    const onChange = (value: string | number) => {
        //過濾文字
        let text = value.toString().split('');
        text = text.filter((char) => /[0-9]|-|\./.test(char));

        //處理小數點 -> 只允許一個小數點
        const dote_index = text.indexOf('.')
        text = text.filter((char) => !/\./.test(char)); //移除所有小數點
        if (dote_index > 0) text.splice(dote_index, 0, '.'); //放回小數點

        //處理負數
        const isNegative = text.includes('-');
        text = text.filter((char) => !/-/.test(char)); //移除所有負數符號

        //分隔銀碼
        value = text.join(''); //合併回完整字串
        const digits = value.split('.'); //將小數分開
        const intDigits = digits[0].split(''); // 整數的部分切割成陣列
        const groupDigits = [];
        while (intDigits.length > 3) groupDigits.unshift(intDigits.splice(intDigits.length - 3, 3).join(''));// 當數字足夠，從後面取出三個位數，轉成字串塞回 groupDigits
        groupDigits.unshift(intDigits.join('')); //將剩餘嘅放回前面
        digits[0] = groupDigits.join(','); //合併
        value = digits.join("."); //合併回完整字串

        if (isNegative) value = '-' + value; //前面加負數符號

        const real_value = value.replace(',', ''); //移除所有逗號, 另外儲存
        if(value.length > 0) value = symbol + value; //加上符號

        setDisplayValue(value);
        setReal_value(real_value);
        onValueChange(parseFloat(real_value) || 0);
    }

    const focus = () => {
        setFocus(true);
        setReal_value('')
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
        //取得文字
        getText: () => {
            return real_value;
        },
        focus: () => {
            inputRef.current?.focus();
            focus();
        },
        blur: () => {
            inputRef.current?.blur();
            blur();
        }
    }));

    return (
        <View style={[containerStyle, {position: 'relative'}]}>
            <TextInput style={style.inputStyle} value={displayValue} placeholder={placeholder} dense={true} underlineColor={isFocus ? Color.primaryColor : undefined}/>
            <TextInput {...inputProps} caretHidden={true} contextMenuHidden={true} ref={inputRef} style={style.coverInput} keyboardType='numeric' value={real_value} onChangeText={onChange} dense={true} onFocus={focus} onBlur={blur} selectTextOnFocus={true}/>
        </View>
    );
}) as InputComponent;

/* 整數輸入 */
const NumberInput = forwardRef<InputRef, InputProps>(({
                                                          symbol = '',
                                                          value = '',
                                                          inputStyle,
                                                          containerStyle,
                                                          inputProps = {},
                                                          placeholder = '',
                                                          onValueChange = () => {
                                                          },
                                                          onFocus = () => null,
                                                          onBlur = () => null
                                                      }, ref) => {
    const inputRef = useRef<NativeTextInput | null>(null);
    const [displayValue, setDisplayValue] = useState('');
    const [real_value, setReal_value] = useState('');
    const [isFocus, setFocus] = useState(false);

    /* 文字更改 */
    const onChange = (value: string | number) => {
        //過濾文字
        let text = value.toString().split('');
        text = text.filter((char) => /[0-9]|-/.test(char));

        //處理負數
        const isNegative = text.includes('-');
        text = text.filter((char) => !/-/.test(char)); //移除所有負數符號

        //分隔銀碼
        const groupDigits = [];
        while (text.length > 3) groupDigits.unshift(text.splice(text.length - 3, 3).join(''));// 當數字足夠，從後面取出三個位數，轉成字串塞回 groupDigits
        groupDigits.unshift(text.join('')); //將剩餘嘅放回前面
        value = groupDigits.join(','); //合併

        if (isNegative) value = '-' + value; //前面加負數符號

        const real_value = value.replace(',', ''); //移除所有逗號, 另外儲存
        if (value.length > 0) value = symbol + value; //加上符號

        setDisplayValue(value);
        setReal_value(real_value);
        onValueChange(parseInt(real_value) || 0);
    }

    const focus = () => {
        setFocus(true);
        setReal_value('')
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
            inputRef.current?.focus();
            focus();
        },
        blur: () => {
            inputRef.current?.blur();
            blur();
        }
    }));

    return (
        <View style={[containerStyle, {position: 'relative'}]}>
            <TextInput style={style.inputStyle} value={displayValue} placeholder={placeholder} dense={true} underlineColor={isFocus ? Color.primaryColor : undefined}/>
            <TextInput {...inputProps} caretHidden={true} contextMenuHidden={true} ref={inputRef} style={style.coverInput} keyboardType='numeric' value={real_value} onChangeText={onChange} dense={true} onFocus={focus} onBlur={blur} selectTextOnFocus={true}/>
        </View>
    );
});

/* 輸入參數 */
interface NumKeyboardProps {
    onKeyPress: (value: string) => void
}

/* 參考方法 */
type NumKeyboardRef = {
    openKeyBoard: () => void,
    closeKeyBoard: () => void,
    isOpen: () => boolean
}

/* 介面 */
interface NumKeyboardComponent extends React.ForwardRefExoticComponent<NumKeyboardProps & React.RefAttributes<NumKeyboardRef>> {
    openKeyBoard: () => void,
    closeKeyBoard: () => void,
    isOpen: () => boolean
}

/* 數字鍵盤 */
const NumKeyboard = forwardRef<NumKeyboardRef, NumKeyboardProps>(({
                                                                      onKeyPress = () => {
                                                                      }
                                                                  }, ref) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const {colors} = useTheme();
    const [display, setDisplay] = useState<string | undefined>('none');

    /* 鍵盤點擊 */
    const onPress = (value: string) => {
        onKeyPress(value)
    }

    /* ref function */
    useImperativeHandle(ref, () => ({
        //打開鍵盤
        openKeyBoard: () => {
            //if(isOpen) return;
            setDisplay(undefined);
        },
        //關閉鍵盤
        closeKeyBoard: () => {
            setDisplay('none');
        },
        //鍵盤是否打開
        isOpen: () => display === undefined
    }));

    return (
        // @ts-ignore
        <Animated.View style={{display, height: 220}}>
            <View style={[style.row, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('1')}><View style={style.button}><Text style={style.text}>1</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('2')}><View style={style.button}><Text style={style.text}>2</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('3')}><View style={style.button}><Text style={style.text}>3</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('back')}><View style={style.button}><IconButton icon={'backspace-outline'} iconColor={colors.text}/></View></TouchableNativeFeedback>
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
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => {
                }}><View style={style.button}><IconButton icon={'calculator'} iconColor={colors.text}/></View></TouchableNativeFeedback>
            </View>
            <View style={[style.row, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('00')}><View style={style.button}><Text style={style.text}>00</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('0')}><View style={style.button}><Text style={style.text}>0</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('.')}><View style={style.button}><Text style={style.text}>.</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('done')}><View style={style.button}><IconButton icon={'check'} iconColor={colors.text}/></View></TouchableNativeFeedback>
            </View>
        </Animated.View>
    )
}) as NumKeyboardComponent;

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
        flexDirection: "row",
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        textAlign: 'center',
        fontSize: 20,
    },
})