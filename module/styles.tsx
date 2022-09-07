import {StyleSheet, TouchableNativeFeedback} from "react-native";
import React from "react";
import {Color} from "./Color";
import {Text, useTheme} from "react-native-paper";

/* 細小文字 */
const SmailText: React.FC<{ color?: string | number, children: React.ReactNode }> = ({color, children}) => {
    const {colors} = useTheme();

    return (
        <Text style={{fontSize: 10, color: color || colors.text, marginTop: 3}}>{children}</Text>
    );
}

/* 通用styles */
const styles = StyleSheet.create({});

/* 預設android原生點擊反應 */
const TouchableNativeFeedbackPresets = {
    default: {
        useForeground: true,
        background: TouchableNativeFeedback.Ripple(Color.darkColorLight, false),
    },
    color: {
        seForeground: true,
        background: TouchableNativeFeedback.Ripple(Color.primaryColor, false),
    },
    borderless: {
        useForeground: true,
        background: TouchableNativeFeedback.Ripple(Color.darkColorLight, true),
    },
    borderless_color: {
        useForeground: true,
        background: TouchableNativeFeedback.Ripple(Color.primaryColor, true),
    }
}
export default styles;
export {SmailText, TouchableNativeFeedbackPresets}