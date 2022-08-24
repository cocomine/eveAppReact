import React, {useImperativeHandle, useRef, useState} from "react";
import {StyleSheet} from "react-native";
import {TextInput} from "react-native-paper";

/* 輸入組件 */
const Input = React.forwardRef(({
                                    value,
                                    style,
                                    onChangeText = () => null,
                                    maxLength,
                                    onSubmitEditing = () => null,
                                    ...props
                                }, ref) => {
    const [val, setVal] = useState(value ? value.toString() : '');
    const inputRef = useRef(null);

    /* 文字更新 */
    const update = (text) => {
        setVal(text);
        onChangeText(text);
        if(maxLength){
            text.length >= maxLength && submitEditing();
        }
    }
    const submitEditing = (event) => {
        onSubmitEditing(event)
    }

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current.focus(),
        blur: () => inputRef.current.blur(),
        clear: () => inputRef.current.clear(),
        isFocused: () => inputRef.current.isFocused(),
        setValue: (value) => setVal(value), //設置文字
        getValue: () => val, //取得文字
        setNativeProps: (props) => inputRef.current.setNativeProps(props)
    }));

    return (
        <TextInput {...props} ref={inputRef} style={[style, styles.formInput]} maxLength={maxLength} onSubmitEditing={submitEditing} value={val} onChangeText={update} dense={true}/>
    )
});

const styles = StyleSheet.create({
    formInput: {
        flex: 1,
        backgroundColor: 'transparent'
    }
})
export default Input;