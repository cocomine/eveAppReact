import React from "react";
import {TouchableNativeFeedback, TouchableNativeFeedbackProps} from 'react-native';
import {Color} from "./Color";

const Ripple = {
    Default: (pops: TouchableNativeFeedbackProps) => {
        return (
            <TouchableNativeFeedback useForeground={true} background={TouchableNativeFeedback.Ripple(Color.darkColorLight, false)} {...pops}>
                {pops.children}
            </TouchableNativeFeedback>
        )
    },
    Color: (pops: TouchableNativeFeedbackProps) => {
        return (
            <TouchableNativeFeedback useForeground={true} background={TouchableNativeFeedback.Ripple(Color.primaryColor, false)} {...pops}>
                {pops.children}
            </TouchableNativeFeedback>
        )
    },
    Borderless: (pops: TouchableNativeFeedbackProps) => {
        return (
            <TouchableNativeFeedback useForeground={true} background={TouchableNativeFeedback.Ripple(Color.darkColorLight, true)} {...pops}>
                {pops.children}
            </TouchableNativeFeedback>
        )
    },
    BorderlessColor: (pops: TouchableNativeFeedbackProps) => {
        return (
            <TouchableNativeFeedback useForeground={true} background={TouchableNativeFeedback.Ripple(Color.primaryColor, true)} {...pops}>
                {pops.children}
            </TouchableNativeFeedback>
        )
    },
}

export {Ripple}