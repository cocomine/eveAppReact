import React, {useEffect, useState} from 'react';
import {TextInput} from "react-native";

/* 小數輸入 */
const DecimalInput = (props) => {
    const [displayValue, setDisplayValue] = useState(props.value ? props.value : '');
    let value = props.value ? props.value : 0.0;

    useEffect(() => {
        value = parseFloat(displayValue);
        props.onValueChange(isNaN(value) ? 0.0 : value); //內容已更改, 觸發call back
    }, [displayValue]);

    return(
        <TextInput {...props} keyboardType='numeric' value={value} onChangeText={(text) => {
            text = text.replace(/[^0-9.]/g, '');
            setDisplayValue(text);
        }}/>
    );
}

/* 整數輸入 */
const NumberInput = (props) => {
    const [displayValue, setDisplayValue] = useState(props.value ? props.value : '');
    let value = props.value ? props.value : 0;

    useEffect(() => {
        value = parseInt(displayValue);
        props.onValueChange(isNaN(value) ? 0 : value); //內容已更改, 觸發call back
    }, [displayValue]);

    return(
        <TextInput {...props} keyboardType='numeric' value={value} onChangeText={(Text) => {
            setDisplayValue(Text.replace(/[^0-9]/g, ''));
        }}/>
    );
}

export {DecimalInput, NumberInput}