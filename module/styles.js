import {StyleSheet, Text, TouchableNativeFeedback} from "react-native";
import React from "react";
import {Color} from "./Color";

/* 細小文字 */
const SmailText = ({color, children}) => {
    return(
        <Text style={{fontSize: 10, color: color, marginTop: 3}}>{children}</Text>
    );
}
export {SmailText};

/* 通用styles */
export const styles = StyleSheet.create({

});

/* 預設陰影 */
export const ShadowPresets = {
    default: {
        containerViewStyle: {zIndex: 1, elevation: 1},
        distance: 5,
        startColor: 'rgba(0,0,0,0.20)',
    }
}

/* 預設android原生點擊反應 */
export const TouchableNativeFeedbackPresets = {
    default:{
        useForeground: true,
        background: TouchableNativeFeedback.Ripple(Color.darkColorLight, false),
    },
    borderless:{
        useForeground: true,
        background: TouchableNativeFeedback.Ripple(Color.darkColorLight, true),
    }
}