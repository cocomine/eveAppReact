import React, {useImperativeHandle, useRef, useState} from "react";
import {StyleSheet} from "react-native";
import {TextInput} from "react-native-paper";

const Input = React.forwardRef(({value, style, onChangeText = () => null, ...props}, ref) => {
    const [val, setVal] = useState(value && value.toString());
    const inputRef = useRef(null);

    const update = (text) => {
        setVal(text);
        onChangeText(text);
    }

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current.focus(),
        blur: () => inputRef.current.blur(),
        clear: () => inputRef.current.clear(),
        isFocused: () => inputRef.current.isFocused(),
        setValue: (value) => setVal(value),
        getValue: () => val,
        setNativeProps: (props) => inputRef.current.setNativeProps(props)
    }));

    return (
        <TextInput {...props} ref={inputRef} style={[style, styles.formInput]} defaultValue={val} onChangeText={update} dense={true}/>
    )
});

const styles = StyleSheet.create({
    formInput: {
        flex: 1,
        backgroundColor: 'transparent'
    }
})
export default Input;