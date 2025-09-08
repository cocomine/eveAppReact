/* 輸入參數 */
import React, {forwardRef, useCallback, useImperativeHandle, useState} from 'react';
import {StyleSheet, useColorScheme, View} from 'react-native';
import {IconButton, MD2Theme, Text, useTheme} from 'react-native-paper';
import {Color} from './Color';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, {SlideInDown, SlideOutDown} from 'react-native-reanimated';
import {Ripple} from './Ripple';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

interface NumKeyboardProps {
    onKeyPress: (value: string) => void;
    disableCalculator?: boolean;
}

/* 參考方法 */
type NumKeyboardRef = {
    openKeyBoard: () => void;
    closeKeyBoard: () => void;
    isOpen: () => boolean;
};

/* 數字鍵盤 */
const NumKeyboard = forwardRef<NumKeyboardRef, NumKeyboardProps>(
    ({onKeyPress = () => null, disableCalculator = false}, ref) => {
        const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
        const {colors} = useTheme<MD2Theme>();
        const [display, setDisplay] = useState<boolean>(false);
        const [isDisableCalculator, setIsDisableCalculator] = useState<boolean>(disableCalculator);
        const BG_color = isDarkMode ? Color.darkBlock : Color.white;
        const insets = useSafeAreaInsets(); //安全區域

        /* 鍵盤點擊 */
        const onPress = useCallback(
            (value: string) => {
                ReactNativeHapticFeedback.trigger('keyboardTap');
                onKeyPress(value);
            },
            [onKeyPress],
        );

        /* ref function */
        useImperativeHandle(ref, () => ({
            //打開鍵盤
            openKeyBoard: () => {
                //if(isOpen) return;
                setDisplay(true);
            },
            //關閉鍵盤
            closeKeyBoard: () => {
                setDisplay(false);
            },
            //鍵盤是否打開
            isOpen: () => display,
        }));

        if (display) {
            return (
                <Animated.View
                    style={{height: 220, paddingBottom: insets.bottom}}
                    entering={SlideInDown}
                    exiting={SlideOutDown}>
                    <View style={[style.row, {backgroundColor: BG_color}]}>
                        <Ripple.Color onPress={() => onPress('1')}>
                            <View style={style.button}>
                                <Text style={style.text}>1</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('2')}>
                            <View style={style.button}>
                                <Text style={style.text}>2</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('3')}>
                            <View style={style.button}>
                                <Text style={style.text}>3</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('back')}>
                            <View style={style.button}>
                                <IconButton icon={'backspace-outline'} iconColor={colors.text} />
                            </View>
                        </Ripple.Color>
                    </View>
                    <View style={[style.row, {backgroundColor: BG_color}]}>
                        <Ripple.Color onPress={() => onPress('4')}>
                            <View style={style.button}>
                                <Text style={style.text}>4</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('5')}>
                            <View style={style.button}>
                                <Text style={style.text}>5</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('6')}>
                            <View style={style.button}>
                                <Text style={style.text}>6</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('-')}>
                            <View style={style.button}>
                                <Text style={style.text}>-</Text>
                            </View>
                        </Ripple.Color>
                    </View>
                    <View style={[style.row, {backgroundColor: BG_color}]}>
                        <Ripple.Color onPress={() => onPress('7')}>
                            <View style={style.button}>
                                <Text style={style.text}>7</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('8')}>
                            <View style={style.button}>
                                <Text style={style.text}>8</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('9')}>
                            <View style={style.button}>
                                <Text style={style.text}>9</Text>
                            </View>
                        </Ripple.Color>
                        {isDisableCalculator ? (
                            <View style={style.button} />
                        ) : (
                            <Ripple.Color onPress={() => onPress('calculator')}>
                                <View style={style.button}>
                                    <IconButton icon={'calculator'} iconColor={colors.text} />
                                </View>
                            </Ripple.Color>
                        )}
                    </View>
                    <View style={[style.row, {backgroundColor: BG_color}]}>
                        <Ripple.Color onPress={() => onPress('00')}>
                            <View style={style.button}>
                                <Text style={style.text}>00</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('0')}>
                            <View style={style.button}>
                                <Text style={style.text}>0</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('.')}>
                            <View style={style.button}>
                                <Text style={style.text}>.</Text>
                            </View>
                        </Ripple.Color>
                        <Ripple.Color onPress={() => onPress('done')}>
                            <View style={style.button}>
                                <IconButton icon={'check'} iconColor={colors.text} />
                            </View>
                        </Ripple.Color>
                    </View>
                </Animated.View>
            );
        } else {
            return null;
        }
    },
);

const style = StyleSheet.create({
    row: {
        flex: 1,
        flexDirection: 'row',
        borderTopWidth: 0.7,
        borderColor: Color.darkColorLight,
    },
    button: {
        flex: 1,
        borderRightWidth: 0.7,
        borderColor: Color.darkColorLight,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        textAlign: 'center',
        fontSize: 20,
    },
});

export {NumKeyboard};
