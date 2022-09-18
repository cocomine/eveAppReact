import {EntryAnimationsValues, ExitAnimationsValues, withTiming} from "react-native-reanimated";

function FoldIn(values: EntryAnimationsValues) {
    'worklet'
    const animations = {
        height: withTiming(values.targetHeight),
    };
    const initialValues = {
        height: 0,
        overflow: 'hidden'
    };
    return {
        initialValues,
        animations,
    }
}

function FoldOut(values: ExitAnimationsValues) {
    'worklet'
    const animations = {
        height: withTiming(0),
    };
    const initialValues = {
        height: values.currentHeight,
        overflow: 'hidden'
    };
    return {
        initialValues,
        animations,
    }
}

export {FoldIn, FoldOut}