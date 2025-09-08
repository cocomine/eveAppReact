import React, {forwardRef, useCallback, useEffect, useRef, useState} from 'react';
import {
    Keyboard,
    KeyboardEvent,
    ScrollView,
    StyleSheet,
    ToastAndroid,
    TouchableWithoutFeedback,
    useColorScheme,
    useWindowDimensions,
    View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {Color} from './Color';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {DB} from './SQLite';
import TextInput, {InputRef} from '../module/TextInput';
import ErrorHelperText from '../module/ErrorHelperText';

interface Props {
    value: string;
    onSubmitEditing: () => void;
    error?: string | null;
    scrollOffset: number;
    onChangeText: (text: string) => void;
}

/**
 * 地點輸入框(帶自動完成)
 */
const LocalInput = forwardRef<InputRef, Props>(
    ({value, onSubmitEditing, error = null, scrollOffset, onChangeText}, ref) => {
        const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
        const [auto_complete_list, setAutoCompleteList] = useState<string[]>([]); //自動完成
        const [input_text, setInputText] = useState('');
        const [is_list_shown, setIsListShown] = useState(false);
        const [list_position, setListPosition] = useState<'up' | 'down'>('down'); //列表在上方顯示還在下方顯示
        const device_height = useWindowDimensions().height; //
        const [keyboard_height, setKeyboardHeight] = useState(0); //
        const is_focus = useRef(false); //是否聚焦
        const list_ref = useRef<Animated.View>(null); //列表ref

        /* 文字被更改 */
        const onChange = (text: string) => {
            setInputText(text);
            onChangeText(text);
        };

        /* 聚焦 */
        const onFocus = () => {
            is_focus.current = true;
        };

        /* 預設文字 */
        useEffect(() => {
            setInputText(value);
        }, [value]);

        /* 關閉自動完成, 並且儲存值 */
        function closeAndSave(callback?: () => void) {
            switchShowList(false, () => {
                callback && callback();
            });
        }

        /* 自動完成 表列文字 */
        const ListText = ({item}: {item: string}) => {
            let word_index = item.search(new RegExp(input_text, 'i'));

            let first = item.substring(0, word_index);
            let correct = item.substring(word_index, word_index + input_text.length); //符合文字
            let last = item.substring(word_index + input_text.length);

            return (
                <Text>
                    <Text>{first}</Text>
                    <Text style={{color: Color.primaryColor}}>{correct}</Text>
                    <Text>{last}</Text>
                </Text>
            );
        };

        /* 動畫 */
        const fade_anim = useSharedValue(0);
        const scale_anim = useSharedValue(0.8);

        const animated_style = useAnimatedStyle(() => {
            return {
                opacity: fade_anim.value,
                transform: [{scale: scale_anim.value}],
            };
        });

        /* 切換開啟關閉狀態 */
        const switchShowList = useCallback(
            (setShow: boolean, callback: () => void = () => null) => {
                const animation_config = {duration: 200};

                if (setShow) {
                    //開啟
                    runOnJS(setIsListShown)(true);
                    fade_anim.value = withTiming(1, animation_config);
                    scale_anim.value = withTiming(1, animation_config);
                } else {
                    //關閉
                    const onFinish = (finished?: boolean) => {
                        if (finished) {
                            runOnJS(setIsListShown)(false);
                            runOnJS(callback)();
                            runOnJS(setListPosition)('down');
                        }
                    };
                    fade_anim.value = withTiming(0, animation_config);
                    scale_anim.value = withTiming(0.8, animation_config, onFinish);
                }
            },
            [fade_anim, scale_anim],
        );

        /* 判斷空間是否充足 */
        useEffect(() => {
            if (!is_list_shown) return;

            const timeout_id = setTimeout(() => {
                list_ref.current?.measure((fx, fy, w, h, px, py) => {
                    const tmp = device_height - keyboard_height - py - h - (list_position === 'up' ? h : 0); //如果已處於上方, 則再減高度
                    // console.log(deviceHeight, keybordHeight, py, h, scrollOffset);
                    // console.log(tmp, tmp <= 10);
                    // 如果下方空間不夠側跳往上方
                    if (tmp <= 10) {
                        setListPosition('up');
                    } else {
                        setListPosition('down');
                    }
                });
            }, 5);

            return () => clearTimeout(timeout_id);
        }, [is_list_shown, input_text, scrollOffset, device_height, keyboard_height, list_position]);

        /* 取得鍵盤高度 */
        useEffect(() => {
            const show_event = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) =>
                setKeyboardHeight(e.endCoordinates.height),
            );
            const hide_event = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));

            // 清除事件
            return () => {
                show_event.remove();
                hide_event.remove();
            };
        }, []);

        /* 向數據庫取數據(autocomplete) */
        useEffect(() => {
            if (!is_focus.current) return; //非聚焦狀態不處理

            //提取數據
            const extractData = async () => {
                try {
                    await DB.readTransaction(async function (tr) {
                        const [, rs] = await tr.executeSql(
                            'SELECT DISTINCT Local FROM Record WHERE Local LIKE ? LIMIT 10',
                            ['%' + input_text + '%'],
                        );

                        if (rs.rows.length <= 0 || input_text.length <= 0) {
                            switchShowList(false); //關閉列表 沒有數據
                        } else {
                            switchShowList(true);
                            let val: string[] = [];
                            for (let i = 0; i < rs.rows.length; i++) {
                                val.push(rs.rows.item(i).Local);
                            }
                            setAutoCompleteList(val);
                        }
                    });
                } catch (e: any) {
                    console.error('傳輸錯誤: ' + e.message);
                    ToastAndroid.show('讀取失敗', ToastAndroid.SHORT);
                }
            };

            extractData().then();
        }, [input_text, switchShowList]);

        return (
            <View style={{position: 'relative', flex: 1}}>
                <TextInput
                    onChangeText={onChange}
                    value={input_text}
                    autoComplete={'off'}
                    onSubmitEditing={() => closeAndSave(onSubmitEditing)}
                    returnKeyType={'next'}
                    error={error !== null}
                    onBlur={() => closeAndSave()}
                    ref={ref}
                    onFocus={onFocus}
                />
                <ErrorHelperText visible={error !== null}>{error}</ErrorHelperText>
                <Animated.View
                    ref={list_ref}
                    style={[
                        style.auto_complete_view,
                        {
                            backgroundColor: is_dark_mode ? Color.darkColor : Color.white,
                            display: is_list_shown ? undefined : 'none',
                            top: list_position === 'up' ? null : '100%',
                            bottom: list_position === 'down' ? null : '100%',
                        },
                        animated_style,
                    ]}>
                    <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps={'always'}>
                        {auto_complete_list.map((data, index) => (
                            <TouchableWithoutFeedback onPress={() => onChange(data)} key={index}>
                                <View style={{flex: 1, paddingVertical: 8}}>
                                    <ListText item={data} />
                                </View>
                            </TouchableWithoutFeedback>
                        ))}
                    </ScrollView>
                </Animated.View>
            </View>
        );
    },
);

const style = StyleSheet.create({
    auto_complete_view: {
        flex: 1,
        maxHeight: 200,
        width: '90%',
        position: 'absolute',
        elevation: 5,
        zIndex: 5,
        borderRadius: 10,
        padding: 5,
    },
});

export {LocalInput};
