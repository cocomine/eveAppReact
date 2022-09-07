import React, {useCallback, useRef, useState} from 'react';
import {SafeAreaView, StyleSheet, TouchableNativeFeedback, useColorScheme, View} from 'react-native';
import {IconButton, Text, useTheme} from 'react-native-paper';
import {Color} from './Color';
import {TouchableNativeFeedbackPresets} from './styles';
import {NavigationProp, RouteProp} from "@react-navigation/core/src/types";
import {ParamListBase} from "@react-navigation/routers";
import {AutoSizeText, ResizeTextMode} from 'react-native-auto-size-text';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const Calculator: React.FC<{ navigation: NavigationProp<ReactNavigation.RootParamList>, route: RouteProp<ParamListBase> }> = ({
                                                                                                                                  navigation,
                                                                                                                                  route
                                                                                                                              }) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const {colors} = useTheme();
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;
    const [row1, setRow1] = useState('');
    const [row2, setRow2] = useState('');
    const array = useRef<string[]>([]);

    /* Key Press */
    const onPress = useCallback((value: string) => {
        ReactNativeHapticFeedback.trigger("keyboardTap");

        let pop = array.current.pop();
        if (!pop) {
            //is undefined
            if (/[0-9]+(\.[0-9]+)?/.test(value)) array.current.push(value);
            else if (/\./.test(value)) array.current.push('0' + value);
            else array.current.push('0', value);
        } else {
            let popIsNumber = /[0-9]+(\.[0-9]+)?/.test(pop);

            if (/[0-9]+(\.[0-9]+)?/.test(value)) {
                //is number
                if (popIsNumber) array.current.push(pop + value);
                else array.current.push(pop, value);
            } else if (/\./.test(value)) {
                //is .
                if (popIsNumber) array.current.push(pop + value);
                else array.current.push(pop, '0' + value);
            } else {
                //is (+ - * /)
                if (popIsNumber) array.current.push(pop, value);
                else array.current.push(value);
            }
        }
        //console.log(array.current)

        setRow1(array.current.join('')); //print
    }, []);

    /* Calculator */
    const onCalculator = useCallback(() => {
        //console.log(array.current);

        /* convert word */
        let convert = array.current.map((item) => {
            if (item === '÷') return '/';
            if (item === '×') return '*';
            if (item === '–') return '-';

            const tmp = parseFloat(item);
            if (isNaN(tmp)) return item;
            return tmp;
        });
        //console.log(convert);

        /* Infix to postfix */
        const postfix = [];
        const stack: (string | number)[] = [];
        convert.forEach((item) => {
            if (typeof item === 'number') {
                postfix.push(item);
            } else {
                while (stack.length > 0) {
                    const op = stack.pop() as string | number;
                    if (op === '*' || op === '/') {
                        postfix.push(op);
                    } else {
                        stack.push(op);
                        break;
                    }
                }
                stack.push(item);
            }
        });
        while (stack.length > 0) {
            postfix.push(stack.pop());
        }
        //console.log(postfix);

        /* Calculate */
        postfix.forEach((item) => {
            if (typeof item === 'number') {
                stack.push(item);
            } else {
                const opd2 = stack.pop() as number;
                const opd1 = stack.pop() as number;
                const value = evaluate(opd1, item as string, opd2);
                stack.push(value);
            }
        });
        const answer = stack.pop() as number;

        /* print out */
        setRow2(array.current.join(''));
        setRow1(answer.toFixed(2));
        array.current = [answer.toFixed(2)];
        //console.log(array.current);
    }, []);

    /* delete */
    const onBack = useCallback(() => {
        let pop = array.current.pop() as string;
        pop = pop.slice(0, -1);
        if (pop.length > 0) array.current.push(pop);

        setRow1(array.current.join(''));
    }, []);

    /* Close */
    const onClose = useCallback(() => {
        navigation.goBack();
    }, []);

    /* AC */
    const onAC = useCallback(() => {
        setRow1('');
        setRow2('');
        array.current = [];
    }, []);

    /* Done (send data) */
    const onDone = useCallback(() => {
        onCalculator()
        // @ts-ignore
        navigation.navigate('AddRecord', {value: array.current[0], inputID: route.params.inputID})
    }, [navigation]);

    return (
        <SafeAreaView style={{flex: 1}}>
            <React.StrictMode>
                <View style={{flex: 1, flexDirection: 'column'}}>
                    <View style={{alignItems: 'flex-end'}}>
                        <IconButton icon={'close'} iconColor={colors.text} animated={true} onPress={onClose}/>
                    </View>
                    <View style={{flex: 1 / 4, paddingHorizontal: 20, marginBottom: 10}}>
                        <View style={[style.show,]}>
                            <AutoSizeText style={{
                                color: Color.textGary,
                                textAlign: 'right'
                            }} fontSize={30} numberOfLines={3} mode={ResizeTextMode.max_lines}>{row2}</AutoSizeText>
                        </View>
                        <View style={style.show}>
                            <AutoSizeText style={{
                                color: colors.text,
                                textAlign: 'right'
                            }} fontSize={40} numberOfLines={3} mode={ResizeTextMode.max_lines}>{row1}</AutoSizeText>
                        </View>
                    </View>
                    <View style={{flex: 3 / 4}}>
                        <View style={[style.row]}>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={onAC}><View style={style.button}><Text style={style.text}>AC</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '÷')}><View style={style.button}><Text style={style.text}>÷</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '×')}><View style={style.button}><Text style={style.text}>×</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={onBack}><View style={style.button}><IconButton icon={'backspace-outline'} iconColor={colors.text}/></View></TouchableNativeFeedback>
                        </View>
                        <View style={[style.row, {backgroundColor: BG_color}]}>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '7')}><View style={style.button}><Text style={style.text}>7</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '8')}><View style={style.button}><Text style={style.text}>8</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '9')}><View style={style.button}><Text style={style.text}>9</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '–')}><View style={[style.button,
                                {backgroundColor: colors.background}]}><Text style={style.text}>–</Text></View></TouchableNativeFeedback>
                        </View>
                        <View style={[style.row, {backgroundColor: BG_color}]}>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '4')}><View style={style.button}><Text style={style.text}>4</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '5')}><View style={style.button}><Text style={style.text}>5</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '6')}><View style={style.button}><Text style={style.text}>6</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '+')}><View style={[style.button,
                                {backgroundColor: colors.background}]}><Text style={style.text}>+</Text></View></TouchableNativeFeedback>
                        </View>
                        <View style={[style.row, {backgroundColor: BG_color}]}>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '1')}><View style={style.button}><Text style={style.text}>1</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '2')}><View style={style.button}><Text style={style.text}>2</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '3')}><View style={style.button}><Text style={style.text}>3</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={onCalculator}><View style={[style.button,
                                {backgroundColor: colors.background}]}><Text style={style.text}>=</Text></View></TouchableNativeFeedback>
                        </View>
                        <View style={[style.row, {backgroundColor: BG_color}]}>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '00')}><View style={style.button}><Text style={style.text}>00</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '0')}><View style={style.button}><Text style={style.text}>0</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={() => onPress(
                                '.')}><View style={style.button}><Text style={style.text}>.</Text></View></TouchableNativeFeedback>
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.default} onPress={onDone}><View style={[style.button,
                                {backgroundColor: Color.primaryColor}]}><Text style={[style.text,
                                {color: Color.white}]}>完成</Text></View></TouchableNativeFeedback>
                        </View>
                    </View>
                </View>
            </React.StrictMode>
        </SafeAreaView>
    );
};

function evaluate(opd1: number, op: string, opd2: number) {
    switch (op) {
        case '+':
            return opd1 + opd2;
        case '-':
            return opd1 - opd2;
        case '*':
            return opd1 * opd2;
        case '/':
            return opd1 / opd2;
    }
    return 0;
}

export default Calculator;
const style = StyleSheet.create({
    row: {
        flex: 1,
        flexDirection: 'row',
        borderTopWidth: .7,
        borderColor: Color.darkColorLight
    },
    button: {
        flex: 1,
        borderRightWidth: .7,
        borderColor: Color.darkColorLight,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        textAlign: 'right',
        fontSize: 20
    },
    show: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center'
    }
});