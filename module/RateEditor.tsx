import { Decimal } from 'decimal.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, ToastAndroid, TouchableWithoutFeedback, View } from 'react-native';
import { IconButton, Portal, Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DecimalInput, NumInputRef } from './NumInput';
import { NumKeyboard, NumKeyboardRef } from './NumKeyboard';

interface RateEditorProps {
    visible: boolean;
    onDismiss?: () => void;
    rate: Decimal;
    amount: Decimal;
    onChangeRate?: (rate: Decimal) => void;
}

const getHkdValue = (amount: Decimal, rate: Decimal) =>
    !rate.isFinite() || rate.lte(0) ? 0 : amount.div(rate).toDecimalPlaces(2).toNumber();

const parseDecimalInput = (value: string): Decimal | null => {
    if (!value) return null;

    try {
        const parsed_value = new Decimal(value);
        return parsed_value.isFinite() ? parsed_value : null;
    } catch {
        return null;
    }
};

const parseRateInput = (value: string): Decimal | null => {
    const parsed_rate = parseDecimalInput(value)?.div(100);
    return parsed_rate && parsed_rate.gt(0) ? parsed_rate : null;
};

/**
 * 匯率編輯器
 */
export const RateEditor: React.FC<RateEditorProps> = ({ visible, onDismiss, rate, amount, onChangeRate }) => {
    const [is_visible, setIsVisible] = useState<boolean>(visible);
    const [input_rate, setInputRate] = useState<number>(rate.toNumber());
    const [hkd_value, setHkdValue] = useState<number>(getHkdValue(amount, rate));
    const [input_amount, setInputAmount] = useState<Decimal>(amount);
    const [is_online_rate_loading, setIsOnlineRateLoading] = useState(false);
    const focusing_dec_input = useRef<'hkd' | 'rate' | null>(null); //目前聚焦銀碼輸入框
    const theme = useTheme();
    const insets = useSafeAreaInsets(); // 取得安全區域插入值

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
                    const next_rate =
                        currentInput === 'rate' ? parseRateInput(inputRef.getText()) : new Decimal(input_rate);

                    if (!next_rate || !next_rate.isFinite() || next_rate.lte(0)) {
                        ToastAndroid.show('匯率必須大於 0', ToastAndroid.SHORT);
                        return;
                    }

                    dismiss();
                    onChangeRate?.(next_rate);
                    console.log('匯率變更:', next_rate.toNumber());
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
                const dec_value = parseDecimalInput(value);
                if (dec_value && dec_value.gt(0)) {
                    setInputRate(input_amount.div(dec_value).toDecimalPlaces(4).toNumber());
                } else {
                    setInputRate(0);
                }
            }
        },
        [input_amount, is_visible],
    );

    // 匯率值更改
    const onRateValueChange = useCallback(
        (value: string) => {
            if (is_visible && focusing_dec_input.current === 'rate') {
                const dec_value = parseRateInput(value);
                if (dec_value) {
                    setHkdValue(input_amount.div(dec_value).toDP(2).toNumber());
                } else {
                    setHkdValue(0);
                }
            }
        },
        [input_amount, is_visible],
    );

    // 線上更新匯率
    const onlineRate = useCallback(() => {
        setIsOnlineRateLoading(true);
        fetch(
            'https://exchange-rates.abstractapi.com/v1/live/?api_key=513ff6825b484fa2a9d38df074986a5d&base=HKD&target=CNY',
        )
            .then(response => {
                response.json().then(json => {
                    console.log(json);
                    const rates = new Decimal(json.exchange_rates.CNY);
                    setInputRate(rates.toDP(4).toNumber()); //取小數點後4位
                    setHkdValue(getHkdValue(input_amount, rates));
                });
            })
            .catch(error => {
                ToastAndroid.show('獲取匯率失敗 ' + error, ToastAndroid.SHORT);
                console.error('獲取匯率失敗 ', error);
            })
            .finally(() => setIsOnlineRateLoading(false));
    }, [input_amount]);

    // 更新參數
    useEffect(() => {
        setIsVisible(visible);
        if (visible) {
            setInputAmount(amount);
            setHkdValue(getHkdValue(amount, rate));
            setInputRate(rate.toNumber());
            setTimeout(() => inputs.current.hkd?.focus(), 100);
        }
    }, [amount, rate, visible]);

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
                                marginEnd: insets.right,
                                marginStart: insets.left,
                            },
                        ]}
                        entering={SlideInDown}
                        exiting={SlideOutDown}
                    >
                        <View style={{ padding: 20 }}>
                            <View style={style.form_group}>
                                <Text style={{ flex: 1 / 5 }}>港幣</Text>
                                <DecimalInput
                                    ref={ref => {
                                        inputs.current.hkd = ref;
                                    }}
                                    containerStyle={{ flex: 1 }}
                                    value={hkd_value}
                                    placeholder={'$ --'}
                                    inputProps={{ showSoftInputOnFocus: false }}
                                    onValueChange={onHkdValueChange}
                                    symbol={'$ '}
                                    onFocus={() => decimalInputFocus('hkd')}
                                    onPressIn={() => Keyboard.dismiss()}
                                    onBlur={decimalInputBlur}
                                />
                                <IconButton
                                    icon={'reload'}
                                    onPress={onlineRate}
                                    onPressIn={onlineRate}
                                    loading={is_online_rate_loading}
                                />
                            </View>
                            <View style={style.form_group}>
                                <Text style={{ flex: 2 / 5 }}>匯率 (毎百HK$)</Text>
                                <View style={{ flex: 1 }}>
                                    <DecimalInput
                                        ref={ref => {
                                            inputs.current.rate = ref;
                                        }}
                                        containerStyle={{ flex: 1 }}
                                        value={100 * input_rate}
                                        inputProps={{
                                            showSoftInputOnFocus: false,
                                            maxLength: 10,
                                        }}
                                        onValueChange={onRateValueChange}
                                        symbol={'CN¥ '}
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

export type { RateEditorProps };
