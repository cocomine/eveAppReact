import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Decimal} from 'decimal.js';
import {Portal, Text, useTheme} from 'react-native-paper';
import {Keyboard, StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import Animated, {FadeIn, FadeOut, SlideInDown, SlideOutDown} from 'react-native-reanimated';
import {DecimalInput, NumInputRef} from './NumInput';
import {NumKeyboard, NumKeyboardRef} from './NumKeyboard';

interface RateEditorProps {
    visible: boolean;
    onDismiss?: () => void;
    rate: Decimal;
    amount: Decimal;
    onChangeRate?: (rate: Decimal) => void;
}

/**
 * 匯率編輯器
 */
export const RateEditor: React.FC<RateEditorProps> = ({visible, onDismiss, rate, amount, onChangeRate}) => {
    const [is_visible, setIsVisible] = useState(visible);
    const [input_rate, setInputRate] = useState(rate.toString());
    const [input_amount, setInputAmount] = useState(new Decimal(amount || 0));
    const [hkd_value, setHkdValue] = useState(new Decimal(amount || 0).div(rate).toFixed(2));
    const focusing_dec_input = useRef<'hkd' | 'rate' | null>(null); //目前聚焦銀碼輸入框
    const theme = useTheme();

    //textInput refs
    let inputs = useRef<{
        hkd: NumInputRef | null;
        rate: NumInputRef | null;
    }>({
        hkd: null,
        rate: null,
    });
    let num_keyboard_refs = useRef<NumKeyboardRef | null>(null);

    // 對焦金錢輸入欄 => 打開虛擬鍵盤
    const decimalInputFocus = useCallback((id: 'hkd' | 'rate') => {
        focusing_dec_input.current = id;
        num_keyboard_refs.current?.openKeyBoard();
    }, []);

    // 失焦金錢輸入欄 => 關閉虛擬鍵盤
    const decimalInputBlur = useCallback(() => {
        //setInputRate(inputs.current.rate?.getText() || '0');
    }, []);

    // 關閉編輯器
    const dismiss = useCallback(() => {
        if (focusing_dec_input.current !== null) {
            const currentInput = focusing_dec_input.current;
            inputs.current[currentInput]?.blur();
            focusing_dec_input.current = null;
            num_keyboard_refs.current?.closeKeyBoard();
        }
        onDismiss?.();
    }, [onDismiss]);

    // 虛擬鍵盤點擊
    const onKeyPress = useCallback(
        (value: string) => {
            if (focusing_dec_input.current) {
                const currentInput = focusing_dec_input.current;
                const inputRef = inputs.current[currentInput];
                if (!inputRef) return;

                if (value === 'back') {
                    //刪除最後一個文字
                    inputRef.setText(inputRef.getText().slice(0, -1));
                } else if (value === 'done') {
                    //完成輸入
                    dismiss();
                    onChangeRate?.(new Decimal(inputs.current.rate?.getText() ?? input_rate));
                } else {
                    //輸入文字
                    inputRef.setText(inputRef.getText() + value);
                }
            }
        },
        [dismiss, input_rate, onChangeRate],
    );

    // 港幣值更改
    const onHkdValueChange = useCallback(
        (value: string) => {
            if (is_visible && focusing_dec_input.current === 'hkd') {
                console.log(value);
                const dec_value = new Decimal(value || 0);
                if (!dec_value.isZero()) {
                    setInputRate(input_amount.div(dec_value).toFixed(4));
                } else {
                    setInputRate('0');
                }
            }
        },
        [input_amount, is_visible],
    );

    // 匯率值更改
    const onRateValueChange = useCallback(
        (value: string) => {
            if (is_visible && focusing_dec_input.current === 'rate') {
                console.log(value);
                const dec_value = new Decimal(value || 0);
                if (!dec_value.isZero()) {
                    setHkdValue(input_amount.div(dec_value).toFixed(2));
                } else {
                    setHkdValue('0');
                }
            }
        },
        [input_amount, is_visible],
    );

    // 更新參數
    useEffect(() => {
        setIsVisible(visible);
        if (visible) {
            console.log(amount, rate, visible);
            setInputAmount(amount);
            setHkdValue(rate.isZero() ? '0' : amount.div(rate).toFixed(2));
            setInputRate(rate.toString());
            setTimeout(() => inputs.current.hkd?.focus(), 100);
        }
    }, [amount, rate, visible]);

    console.log(focusing_dec_input.current);

    if (!is_visible) return null;
    return (
        <Portal>
            <TouchableWithoutFeedback onPress={dismiss}>
                <Animated.View style={style.backdrop} entering={FadeIn} exiting={FadeOut}>
                    <Animated.View
                        style={[
                            style.container,
                            {
                                backgroundColor: theme.colors.background,
                            },
                        ]}
                        entering={SlideInDown}
                        exiting={SlideOutDown}>
                        <View style={{padding: 20}}>
                            <View style={style.form_group}>
                                <Text style={{flex: 1 / 5}}>港幣</Text>
                                <DecimalInput
                                    ref={ref => {
                                        inputs.current.hkd = ref;
                                    }}
                                    containerStyle={{flex: 1}}
                                    value={hkd_value}
                                    placeholder={'$ --'}
                                    inputProps={{showSoftInputOnFocus: false}}
                                    onValueChange={onHkdValueChange}
                                    symbol={'$ '}
                                    onFocus={() => decimalInputFocus('hkd')}
                                    onPressIn={() => Keyboard.dismiss()}
                                    onBlur={decimalInputBlur}
                                />
                            </View>
                            <View style={style.form_group}>
                                <Text style={{flex: 1 / 5}}>匯率</Text>
                                <View style={{flex: 1}}>
                                    <DecimalInput
                                        ref={ref => {
                                            inputs.current.rate = ref;
                                        }}
                                        containerStyle={{flex: 1}}
                                        value={input_rate}
                                        inputProps={{showSoftInputOnFocus: false, maxLength: 10}}
                                        onValueChange={onRateValueChange}
                                        onFocus={() => decimalInputFocus('rate')}
                                        onPressIn={() => Keyboard.dismiss()}
                                        onBlur={decimalInputBlur}
                                    />
                                </View>
                            </View>
                        </View>
                        <NumKeyboard ref={num_keyboard_refs} onKeyPress={onKeyPress} disableCalculator={true} />
                    </Animated.View>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Portal>
    );
};

const style = StyleSheet.create({
    form_group: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 5,
        borderTopStartRadius: 20,
        borderTopEndRadius: 20,
    },
});
