import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {StyleProp, StyleSheet, TextInput as NativeTextInput, TextStyle, View, ViewStyle} from 'react-native';
import {Color} from './Color';
import {TextInput, TextInputProps} from 'react-native-paper';

/* 輸入參數 */
interface InputProps {
    symbol?: string;
    value?: string | number;
    inputStyle?: StyleProp<TextStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    inputProps?: TextInputProps;
    placeholder?: string;
    onValueChange?: (value: number) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onPressIn?: () => void;
}

/* 參考方法 */
type InputRef = {
    setText: (text: string) => void;
    getText: () => string;
    focus: () => void;
    blur: () => void;
};

/* 介面 */
interface InputComponent extends React.ForwardRefExoticComponent<InputProps & React.RefAttributes<InputRef>> {
    setText: (text: string) => void;
    getText: () => string;
    focus: () => void;
    blur: () => void;
}

/* 小數輸入 */
const DecimalInput = forwardRef<InputRef, InputProps>(
    (
        {
            symbol = '',
            value = '',
            inputStyle = null,
            containerStyle = null,
            inputProps = {},
            placeholder = '',
            onValueChange = () => {},
            onFocus = () => null,
            onBlur = () => null,
            onPressIn = () => null,
        },
        ref,
    ) => {
        const inputRef = useRef<NativeTextInput | null>(null);
        const [displayValue, setDisplayValue] = useState('');
        const [real_value, setReal_value] = useState('');
        const [isFocus, setFocus] = useState(false);

        /* 文字更改 */
        const onChange = useCallback(
            (value1: string | number) => {
                //檢查是否是零
                if (typeof value1 === 'number' && value1 === 0) return;

                //過濾文字
                let text = value1.toString().split('');
                text = text.filter(char => /[0-9]|-|\./.test(char));

                //處理小數點 -> 只允許一個小數點
                const dote_index = text.indexOf('.');
                text = text.filter(char => !/\./.test(char)); //移除所有小數點
                if (dote_index > 0) text.splice(dote_index, 0, '.'); //放回小數點

                //處理負數
                const isNegative = text.includes('-');
                text = text.filter(char => !/-/.test(char)); //移除所有負數符號

                //分隔銀碼
                value1 = text.join(''); //合併回完整字串
                const digits = value1.split('.'); //將小數分開
                const intDigits = digits[0].split(''); // 整數的部分切割成陣列
                const groupDigits = [];
                while (intDigits.length > 3) groupDigits.unshift(intDigits.splice(intDigits.length - 3, 3).join('')); // 當數字足夠，從後面取出三個位數，轉成字串塞回 groupDigits
                groupDigits.unshift(intDigits.join('')); //將剩餘嘅放回前面
                digits[0] = groupDigits.join(','); //合併
                value1 = digits.join('.'); //合併回完整字串

                if (isNegative) value1 = '-' + value1; //前面加負數符號

                const real_value = value1.replace(/,/g, ''); //移除所有逗號, 另外儲存
                if (value1.length > 0) value1 = symbol + value1; //加上符號

                setDisplayValue(value1);
                setReal_value(real_value);
                onValueChange(parseFloat(real_value) || 0);
            },
            [onValueChange, symbol],
        );

        const Focus = () => {
            setFocus(true);
            setReal_value('');
            onFocus();
        };
        const Blur = () => {
            setFocus(false);
            onBlur();
        };

        /* 套用預設文字 */
        useEffect(() => {
            onChange(value);
            //eslint-disable-next-line react-hooks/exhaustive-deps
        }, [value]);

        /* ref function */
        useImperativeHandle(ref, () => ({
            //輸入文字
            setText: text => {
                onChange(text);
            },
            //取得文字
            getText: () => {
                return real_value;
            },
            focus: () => {
                inputRef.current?.focus();
                Focus();
            },
            blur: () => {
                inputRef.current?.blur();
                Blur();
            },
        }));

        return (
            <View style={[containerStyle, {position: 'relative'}]}>
                <TextInput
                    style={[style.inputStyle, inputStyle]}
                    value={displayValue}
                    placeholder={placeholder}
                    dense={true}
                    underlineColor={isFocus ? Color.primaryColor : undefined}
                    showSoftInputOnFocus={false}
                />
                <TextInput
                    {...inputProps}
                    caretHidden={true}
                    contextMenuHidden={true}
                    ref={inputRef}
                    style={style.coverInput}
                    keyboardType="numeric"
                    value={real_value}
                    onChangeText={onChange}
                    dense={true}
                    onFocus={Focus}
                    onBlur={Blur}
                    selectTextOnFocus={true}
                    onPressIn={onPressIn}
                />
            </View>
        );
    },
) as InputComponent;

/* 整數輸入 */
const NumberInput = forwardRef<InputRef, InputProps>(
    (
        {
            symbol = '',
            value = '',
            inputStyle = null,
            containerStyle = null,
            inputProps = {},
            placeholder = '',
            onValueChange = () => null,
            onFocus = () => null,
            onBlur = () => null,
            onPressIn = () => null,
        },
        ref,
    ) => {
        const inputRef = useRef<NativeTextInput | null>(null);
        const [displayValue, setDisplayValue] = useState('');
        const [real_value, setReal_value] = useState('');
        const [isFocus, setFocus] = useState(false);

        /* 文字更改 */
        const onChange = useCallback(
            (value1: string | number) => {
                //檢查是否是零
                if (typeof value1 === 'number' && value1 === 0) return;

                //過濾文字
                let text = value1.toString().split('');
                text = text.filter(char => /[0-9]|-/.test(char));

                //處理負數
                const isNegative = text.includes('-');
                text = text.filter(char => !/-/.test(char)); //移除所有負數符號

                //分隔銀碼
                const groupDigits = [];
                while (text.length > 3) groupDigits.unshift(text.splice(text.length - 3, 3).join('')); // 當數字足夠，從後面取出三個位數，轉成字串塞回 groupDigits
                groupDigits.unshift(text.join('')); //將剩餘嘅放回前面
                value1 = groupDigits.join(','); //合併

                if (isNegative) value1 = '-' + value1; //前面加負數符號

                const real_value1 = value1.replace(/,/g, ''); //移除所有逗號, 另外儲存
                if (value1.length > 0) value1 = symbol + value1; //加上符號

                setDisplayValue(value1);
                setReal_value(real_value1);
                onValueChange(parseInt(real_value1, 10) || 0);
            },
            [onValueChange, symbol],
        );

        const focus = () => {
            setFocus(true);
            setReal_value('');
            onFocus();
        };
        const blur = () => {
            setFocus(false);
            onBlur();
        };

        /* 套用預設文字 */
        useEffect(() => {
            onChange(value);
            //eslint-disable-next-line react-hooks/exhaustive-deps
        }, [value]);

        /* ref function */
        useImperativeHandle(ref, () => ({
            //輸入文字
            setText: text => {
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
            },
            isFocused: () => inputRef.current?.isFocused(),
        }));

        return (
            <View style={[containerStyle, {position: 'relative'}]}>
                <TextInput
                    style={[style.inputStyle, inputStyle]}
                    value={displayValue}
                    placeholder={placeholder}
                    dense={true}
                    underlineColor={isFocus ? Color.primaryColor : undefined}
                    showSoftInputOnFocus={false}
                />
                <TextInput
                    {...inputProps}
                    caretHidden={true}
                    contextMenuHidden={true}
                    ref={inputRef}
                    style={style.coverInput}
                    keyboardType="numeric"
                    value={real_value}
                    onChangeText={onChange}
                    dense={true}
                    onFocus={focus}
                    onBlur={blur}
                    selectTextOnFocus={true}
                    onPressIn={onPressIn}
                />
            </View>
        );
    },
);

export {DecimalInput, NumberInput};

const style = StyleSheet.create({
    inputStyle: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    coverInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0,
        right: 0,
        bottom: 0,
        color: 'transparent',
    },
});
