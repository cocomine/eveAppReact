import React, {useCallback, useState} from 'react';
import {SafeAreaView, StyleSheet, TouchableNativeFeedback, useColorScheme, View} from 'react-native';
import {IconButton, Text, useTheme} from 'react-native-paper';
import {Color} from '../Color';
import {TouchableNativeFeedbackPresets} from '../styles';

const Calculator = ({navigation}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const {colors} = useTheme();
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;
    const [row1, setRow1] = useState('');
    const [row2, setRow2] = useState('');
    //const array = useRef([]);

    const onPress = useCallback((value) => {
        setRow1((prev) => prev + value);
    }, []);

    const onCalculator = useCallback(() => {
        const array = row1.split('');
        console.log(array);
        const convertArray = array.map((chr) => {
            const tmp = parseInt(chr);
            if(isNaN(tmp)){
                if(chr === '÷') return '/';
                if(chr === '×') return '*';
                return chr;
            }else{
                return tmp;
            }
        });

        console.log(convertArray);
        let mageArray = [];
        convertArray.forEach((chr, index) => {
            if(index === 0) return mageArray.push(chr);

            const last = mageArray.pop();
            if(typeof chr === 'number'){
                let tmp;
                if(typeof last === 'number'){
                    tmp = parseInt(last.toString() + chr.toString());
                    return mageArray.push(tmp);
                }
            }
            mageArray.push(last, chr);
        });

        console.log(mageArray);
    }, [row1]);

    /* delete */
    const onBack = useCallback(() => {
        setRow1((prev) => prev.slice(0, -1));
    }, []);

    /* Close */
    const onClose = useCallback(() => {
        navigation.goBack();
    }, []);

    /* AC */
    const onAC = useCallback(() => {
        setRow1('');
        setRow2('');
    }, []);

    /* Done (send data) */
    const onDone = useCallback(() => {
        //todo
    }, []);

    return (
        <SafeAreaView style={{flex: 1}}>
            <React.StrictMode>
                <View style={{flex: 1, flexDirection: 'column'}}>
                    <View style={{backgroundColor: BG_color, alignItems: 'flex-end'}}>
                        <IconButton icon={'close'} iconColor={colors.text} animated={true} onPress={onClose}/>
                    </View>
                    <View style={{flex: 1 / 4, backgroundColor: BG_color, paddingHorizontal: 20}}>
                        <View style={[style.show, {marginBottom: -50}]}>
                            <Text style={[style.text, {fontSize: 20, color: Color.textGary}]}>{row2}</Text>
                        </View>
                        <View style={style.show}>
                            <Text style={[style.text, {fontSize: 25}]}>{row1}</Text>
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
                                '-')}><View style={[style.button,
                                {backgroundColor: colors.background}]}><Text style={style.text}>-</Text></View></TouchableNativeFeedback>
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
                            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.color} onPress={onDone}><View style={[style.button,
                                {backgroundColor: Color.primaryColor}]}><Text style={[style.text,
                                {color: Color.white}]}>完成</Text></View></TouchableNativeFeedback>
                        </View>
                    </View>
                </View>
            </React.StrictMode>
        </SafeAreaView>
    );
};

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
        textAlign: 'center',
        fontSize: 20
    },
    show: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center'
    }
});