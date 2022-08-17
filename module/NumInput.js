import React, {forwardRef, useEffect, useImperativeHandle, useState} from 'react';
import {
    Text,
    TextInput,
    View,
    Animated,
    useColorScheme,
    StyleSheet,
    TouchableNativeFeedback,
    TouchableOpacity, TouchableHighlight
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import {Color} from "./Color";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {TouchableNativeFeedbackPresets} from "./styles";


/* 小數輸入 */
const DecimalInput = (props) => {
    const [displayValue, setDisplayValue] = useState(props.value ? props.value : '');
    let value = props.value ? props.value : 0.0;

    useEffect(() => {
        value = parseFloat(displayValue);
        props.onValueChange(isNaN(value) ? 0.0 : value); //內容已更改, 觸發call back
    }, [displayValue]);

    return (
        <TextInput {...props} keyboardType='numeric' value={displayValue} onChangeText={(text) => {
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

    return (
        <TextInput {...props} keyboardType='numeric' value={displayValue} onChangeText={(Text) => {
            setDisplayValue(Text.replace(/[^0-9]/g, ''));
        }}/>
    );
}

/* 數字鍵盤 */
export const NumKeyboard = forwardRef((props, ref) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    let isOpen = false;
    let onKeyPress = () => {};

    /* 鍵盤點擊 */
    const onPress = (value) => {
        onKeyPress(value)
    }

    /* ref function */
    useImperativeHandle(ref, () => ({
        //點擊 callback
        onKeyPress: (callback) => {
            onKeyPress = callback
        },
        //打開鍵盤
        openKeyBoard: () => {

        },
        //關閉鍵盤
        closeKeyBoard: () => {

        }
    }));

    return (
        <Animated.View style={{height: 220}}>
            <View style={[style.row, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('1')}><View style={style.button}><Text style={style.text}>1</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('2')}><View style={style.button}><Text style={style.text}>2</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('3')}><View style={style.button}><Text style={style.text}>3</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('back')}><View style={style.button}><Feather name={'delete'} style={style.text}/></View></TouchableNativeFeedback>
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
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => {}}><View style={style.button}><Ionicons name={'ios-calculator'} style={style.text}/></View></TouchableNativeFeedback>
            </View>
            <View style={[style.row, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('00')}><View style={style.button}><Text style={style.text}>00</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('0')}><View style={style.button}><Text style={style.text}>0</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('.')}><View style={style.button}><Text style={style.text}>.</Text></View></TouchableNativeFeedback>
                <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={() => onPress('done')}><View style={style.button}><MaterialIcons name={'done'} style={style.text}/></View></TouchableNativeFeedback>
            </View>
        </Animated.View>
    )
})

export {DecimalInput, NumberInput}

const style = StyleSheet.create({
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