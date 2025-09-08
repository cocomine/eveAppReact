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
        const input_ref = useRef<NativeTextInput | null>(null);
        const [display_value, setDisplayValue] = useState('');
        const [real_value, setRealValue] = useState('');
        const [is_focus, setIsFocus] = useState(false);

        /* 文字更改 */
        const onChange = useCallback(
            (value_1: string | number) => {
                //檢查是否是零
                if (typeof value_1 === 'number' && value_1 === 0) return;

                //過濾文字
                let text = value_1.toString().split('');
                text = text.filter(char => /[0-9]|-|\./.test(char));

                //處理小數點 -> 只允許一個小數點
                const dot_index = text.indexOf('.');
                text = text.filter(char => !/\./.test(char)); //移除所有小數點
                if (dot_index > 0) text.splice(dot_index, 0, '.'); //放回小數點

                //處理負數
                const is_negative = text.includes('-');
                text = text.filter(char => !/-/.test(char)); //移除所有負數符號

                //分隔銀碼
                value_1 = text.join(''); //合併回完整字串
                const digits = value_1.split('.'); //將小數分開
                const int_digits = digits[0].split(''); // 整數的部分切割成陣列
                const group_digits = [];
                while (int_digits.length > 3)
                    group_digits.unshift(int_digits.splice(int_digits.length - 3, 3).join('')); // 當數字足夠，從後面取出三個位數，轉成字串塞回 groupDigits
                group_digits.unshift(int_digits.join('')); //將剩餘嘅放回前面
                digits[0] = group_digits.join(','); //合併
                value_1 = digits.join('.'); //合併回完整字串

                if (is_negative) value_1 = '-' + value_1; //前面加負數符號

                const local_real_value = value_1.replace(/,/g, ''); //移除所有逗號, 另外儲存
                if (value_1.length > 0) value_1 = symbol + value_1; //加上符號

                setDisplayValue(value_1);
                setRealValue(local_real_value);
                onValueChange(parseFloat(local_real_value) || 0);
            },
            [onValueChange, symbol],
        );

        const onInputFocus = () => {
            setIsFocus(true);
            setRealValue('');
            onFocus();
        };
        const onInputBlur = () => {
            setIsFocus(false);
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
                input_ref.current?.focus();
                onInputFocus();
            },
            blur: () => {
                input_ref.current?.blur();
                onInputBlur();
            },
        }));

        return (
            <View style={[containerStyle, {position: 'relative'}]}>
                <TextInput
                    style={[STYLE.inputStyle, inputStyle]}
                    value={display_value}
                    placeholder={placeholder}
                    dense={true}
                    underlineColor={is_focus ? Color.primaryColor : undefined}
                    showSoftInputOnFocus={false}
                    underlineStyle={{height: is_focus ? 4 : 2}}
                />
                <TextInput
                    {...inputProps}
                    caretHidden={true}
                    contextMenuHidden={true}
                    ref={input_ref}
                    style={STYLE.coverInput}
                    keyboardType="numeric"
                    value={real_value}
                    onChangeText={onChange}
                    dense={true}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
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
        const input_ref = useRef<NativeTextInput | null>(null);
        const [display_value, setDisplayValue] = useState('');
        const [real_value, setRealValue] = useState('');
        const [is_focus, setIsFocus] = useState(false);

        /* 文字更改 */
        const onChange = useCallback(
            (value_1: string | number) => {
                //檢查是否是零
                if (typeof value_1 === 'number' && value_1 === 0) return;

                //過濾文字
                let text = value_1.toString().split('');
                text = text.filter(char => /[0-9]|-/.test(char));

                //處理負數
                const is_negative = text.includes('-');
                text = text.filter(char => !/-/.test(char)); //移除所有負數符號

                //分隔銀碼
                const group_digits = [];
                while (text.length > 3) group_digits.unshift(text.splice(text.length - 3, 3).join('')); // 當數字足夠，從後面取出三個位數，轉成字串塞回 groupDigits
                group_digits.unshift(text.join('')); //將剩餘嘅放回前面
                value_1 = group_digits.join(','); //合併

                if (is_negative) value_1 = '-' + value_1; //前面加負數符號

                const real_value_1 = value_1.replace(/,/g, ''); //移除所有逗號, 另外儲存
                if (value_1.length > 0) value_1 = symbol + value_1; //加上符號

                setDisplayValue(value_1);
                setRealValue(real_value_1);
                onValueChange(parseInt(real_value_1, 10) || 0);
            },
            [onValueChange, symbol],
        );

        const onInputFocus = () => {
            setIsFocus(true);
            setRealValue('');
            onFocus();
        };
        const onInputBlur = () => {
            setIsFocus(false);
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
                input_ref.current?.focus();
                onInputFocus();
            },
            blur: () => {
                input_ref.current?.blur();
                onInputBlur();
            },
            isFocused: () => input_ref.current?.isFocused(),
        }));

        return (
            <View style={[containerStyle, {position: 'relative'}]}>
                <TextInput
                    style={[STYLE.inputStyle, inputStyle]}
                    value={display_value}
                    placeholder={placeholder}
                    dense={true}
                    underlineColor={is_focus ? Color.primaryColor : undefined}
                    showSoftInputOnFocus={false}
                />
                <TextInput
                    {...inputProps}
                    caretHidden={true}
                    contextMenuHidden={true}
                    ref={input_ref}
                    style={STYLE.coverInput}
                    keyboardType="numeric"
                    value={real_value}
                    onChangeText={onChange}
                    dense={true}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                    selectTextOnFocus={true}
                    onPressIn={onPressIn}
                />
            </View>
        );
    },
);

export {DecimalInput, NumberInput};

const STYLE = StyleSheet.create({
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
