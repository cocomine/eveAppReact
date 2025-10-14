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
import {useHeaderHeight} from '@react-navigation/elements';

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
        const view_ref = useRef<View>(null); //TextInput 容器
        const [list_height, setListHeight] = useState(0); //列表高度
        const header_height = useHeaderHeight();

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
            if (!is_list_shown || list_height === 0) return;

            // 測量 TextInput 容器的位置
            view_ref.current?.measure((fx, fy, width, height, px, py) => {
                // 輸入框頂部y座標 - 標頭高度
                const space_above = py - header_height;
                // 裝置高度 - 鍵盤高度 - 輸入框底部y座標
                const space_below = device_height - keyboard_height - (py + height);

                // 如果下方空間不足，且上方空間足夠，則將列表移至上方
                if (space_below < list_height && space_above > list_height) {
                    setListPosition('up');
                } else {
                    // 預設或當上方空間也不足時，放在下方
                    setListPosition('down');
                }
            });
            // 當列表顯示或滾動時重新計算
        }, [is_list_shown, scrollOffset, device_height, keyboard_height, list_height, header_height]);

        /* 當列表內容渲染完成後，取得其高度 */
        const onListLayout = (event: LayoutChangeEvent) => {
            const {height} = event.nativeEvent.layout;
            // 設置實際高度，觸發位置判斷
            setListHeight(height);
        };

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
                    // 輸入長度限制，防止過長查詢
                    if (input_text.length > 50) {
                        return;
                    }

                    // 轉義 LIKE 查詢中的特殊字符，防止 SQL 注入
                    const escapedText = input_text.replace(/[%_]/g, '\\$&');

                    await DB.readTransaction(async function (tr) {
                        const [, rs] = await tr.executeSql(
                            "SELECT DISTINCT Local FROM Record WHERE Local LIKE ? ESCAPE '\\' LIMIT 10",
                            ['%' + escapedText + '%'],
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
                <View ref={view_ref} collapsable={false}>
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
                </View>
                <ErrorHelperText visible={error !== null}>{error}</ErrorHelperText>
                {is_list_shown && (
                    <Animated.View
                        style={[
                            style.auto_complete_view,
                            {
                                backgroundColor: is_dark_mode ? Color.darkColor : Color.white,
                                top: list_position === 'up' ? null : '100%',
                                bottom: list_position === 'down' ? null : '100%',
                            },
                            animated_style,
                        ]}>
                        <ScrollView
                            nestedScrollEnabled={true}
                            keyboardShouldPersistTaps={'always'}
                            onLayout={onListLayout}>
                            {auto_complete_list.map((data, index) => (
                                <TouchableWithoutFeedback onPress={() => onChange(data)} key={index}>
                                    <View style={{flex: 1, paddingVertical: 8}}>
                                        <ListText item={data} />
                                    </View>
                                </TouchableWithoutFeedback>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}
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
