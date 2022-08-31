import React, {forwardRef, useImperativeHandle, useRef, useState} from "react";
import {StyleProp, StyleSheet, TextInput as NativeTextInput, TextStyle} from "react-native";
import {TextInput} from "react-native-paper";

/* 輸入參數 */
interface Props {
    value?: string,
    style?: StyleProp<TextStyle>,
    onChangeText?: (text: string) => void,
    maxLength?: number,
    onSubmitEditing?: (event: nativeEvent) => void,
    onBlur?: (text: string) => void
}

/* 參考方法 */
type Ref = {
    focus: () => void,
    blur: () => void,
    clear: () => void,
    isFocused: () => void,
    setValue: (value: string) => void, //設置文字
    getValue: () => string, //取得文字
    setNativeProps: (props: any) => void
}

/* 介面 */
interface InputComponent extends React.ForwardRefExoticComponent<Props & React.RefAttributes<Ref>> {
    focus: () => void,
    blur: () => void,
    clear: () => void,
    isFocused: () => void,
    setValue: (value: string) => void, //設置文字
    getValue: () => string, //取得文字
    setNativeProps: (props: any) => void
}

type nativeEvent = {
    text: string,
    target?: number
}

/* 輸入組件 */
const Input = forwardRef<Ref, Props>(({
                                          value = '',
                                          style,
                                          onChangeText = () => null,
                                          maxLength,
                                          onSubmitEditing = () => null,
                                          onBlur = () => null,
                                          ...props
                                      }, ref) => {
    const [val, setVal] = useState(value.toString());
    const inputRef = useRef<NativeTextInput | null>(null);

    /* 文字更新 */
    const update = (text: string) => {
        setVal(text);
        onChangeText(text);
        if (maxLength) {
            text.length >= maxLength && submitEditing({nativeEvent: {text}});
        }
    }

    /* 失去焦點 */
    const blur = () => {
        onBlur(val);
    }

    /* 完成輸入 */
    const submitEditing = ({nativeEvent}: any) => {
        onSubmitEditing(nativeEvent)
    }

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        clear: () => inputRef.current?.clear(),
        isFocused: () => inputRef.current?.isFocused(),
        setValue: (value) => setVal(value), //設置文字
        getValue: () => val, //取得文字
        setNativeProps: (props) => inputRef.current?.setNativeProps(props)
    }));

    return (
        <TextInput {...props} ref={inputRef} style={[style, styles.formInput]} value={value.toString()} maxLength={maxLength} onSubmitEditing={submitEditing} onChangeText={update} onBlur={blur} dense={true}/>
    )
}) as InputComponent;

const styles = StyleSheet.create({
    formInput: {
        flex: 1,
        backgroundColor: 'transparent'
    }
})
export default Input;