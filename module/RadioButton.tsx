import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from "react";
import {Animated, StyleProp, StyleSheet, TextStyle, useColorScheme, View, ViewStyle} from "react-native";
import {Color} from "./Color";
import {Text} from "react-native-paper";
import {Ripple} from "./Ripple";
import EndCallback = Animated.EndCallback;

const ANIME_TIME = 300; //動畫時間

/* 單選按鈕 輸入參數 */
interface Props {
    /* 按鈕大小 */
    size?: number,
    /* 按鈕顏色 */
    color: string | number,
    /* 執行動畫前callback */
    onTransform?: (check: boolean) => void,
    /* 執行動畫後callback */
    onCheck?: (check: boolean) => void,
    /* 顯示標籤 */
    label?: string,
    /* 選擇狀態(不會觸發動畫) */
    selected?: boolean,
    /* 按鈕值 */
    value: string,
    /* 標籤樣式 */
    labelStyle?: StyleProp<TextStyle>,
    /* 框架樣式 */
    containerStyle?: StyleProp<ViewStyle>,
    /* 排列模式 */
    layout?: 'row' | 'column',
}

/* 單選按鈕 參考方法 */
type Ref = {
    /* 修改選擇狀態(觸發動畫) */
    setSelected: (status: boolean) => void,
    /* 取得數按鈕值 */
    getValue: () => string | number
}

/* 單選按鈕 */
const RadioButton = forwardRef<Ref, Props>(({
                                                size = 24,
                                                color,
                                                onTransform = () => null,
                                                onCheck = () => null,
                                                label = '',
                                                selected = false,
                                                value,
                                                labelStyle,
                                                containerStyle,
                                                layout = 'row',
                                            }, ref) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const isSelected = useRef(selected);

    /* 轉換動畫 */
    const border = useRef(new Animated.Value(3)).current; //邊框
    const center = useRef(new Animated.Value(0)).current; //中心
    const borderColor = useRef(new Animated.Value(0)).current; //顏色
    let b_color = borderColor.interpolate({
        inputRange: [0, 1],
        outputRange: [Color.darkColorLight, color]
    } as Animated.InterpolationConfigType) //顏色 mapping
    const transform = useCallback((sel: boolean, callback: EndCallback = () => null) => {
        if (sel) {
            //選取
            Animated.timing(border, {
                toValue: size / 2,
                duration: ANIME_TIME / 2,
                useNativeDriver: false
            }).start(() => {
                Animated.timing(center, {
                    toValue: 4,
                    duration: ANIME_TIME / 2,
                    useNativeDriver: false
                }).start();
            })

            //顏色轉換
            Animated.timing(borderColor, {
                toValue: 1,
                duration: ANIME_TIME,
                useNativeDriver: false
            }).start(callback)
        } else {
            //取消選取
            Animated.timing(center, {
                toValue: 0,
                duration: ANIME_TIME / 2,
                useNativeDriver: false
            }).start(() => {
                Animated.timing(border, {
                    toValue: 3,
                    duration: ANIME_TIME / 2,
                    useNativeDriver: false
                }).start();
            });

            //顏色轉換
            Animated.timing(borderColor, {
                toValue: 0,
                duration: ANIME_TIME,
                useNativeDriver: false
            }).start(callback);
        }
    }, [border, center, borderColor]) //播放動畫

    /* 轉換點擊狀態 */
    const onPress = () => {
        //點擊callback
        isSelected.current = !isSelected.current
        onTransform(isSelected.current)
        transform(isSelected.current, () => {
            onCheck(isSelected.current)
        });
    }

    /* 預設 */
    useEffect(() => {
        isSelected.current = selected;

        //直接修改動畫
        if (selected) {
            border.setValue(size / 2);
            center.setValue(4);
            borderColor.setValue(1);
        } else {
            border.setValue(3);
            center.setValue(0);
            borderColor.setValue(0);
        }
    }, [selected])

    /* ref function */
    useImperativeHandle(ref, () => ({
        setSelected: (status) => {
            isSelected.current = status;
            transform(isSelected.current);
        },
        getValue: () => value
    }));

    return (
        <View style={[style.container, containerStyle, {flexDirection: layout}]}>
            <Ripple.Borderless onPress={onPress}>
                <View style={{width: size, height: size}}>
                    <Animated.View style={[style.border, {borderWidth: border, borderColor: b_color}]}/>
                    <Animated.View style={[style.center, {
                        borderWidth: center,
                        borderColor: isDarkMode ? Color.darkColor : Color.light
                    }]}/>
                </View>
            </Ripple.Borderless>
            <Text style={[labelStyle, {marginLeft: layout === 'row' ? 4 : 0}]} onPress={onPress}>{label}</Text>
        </View>
    )
});

/* 單選按鈕組合 輸入參數 */
interface GroupProps {
    /* 按下回傳, 並且會回傳按鈕值 */
    onPress?: (value: string | number) => void,
    /* 框架樣式 */
    containerStyle?: StyleProp<ViewStyle>,
    /* 排列模式 */
    layout?: 'row' | 'column',
    /* 只可放入 {@link RadioButton} ReactElement, 否則出錯 */
    children: React.ReactElement<Props, typeof RadioButton>[]
}

/* 單選按鈕組合 */
const RadioGroup: React.FC<GroupProps> = ({
                                              onPress = () => null,
                                              containerStyle,
                                              layout = 'row',
                                              children
                                          }) => {

    /* radioButtons ref */
    const radioButtonsRef = useRef<Ref[]>([]);
    let [radioButtons, setRB] = useState(null);

    /* radioButtons clone */
    useEffect(() => {
        // @ts-ignore
        setRB(() => {
            return children.map((child, index) => {
                return React.cloneElement(child, {
                    onTransform: (status: boolean) => press(index),
                    selected: child.props.selected,
                    containerStyle: [child.props.containerStyle, {marginLeft: layout === 'row' && index !== 0 ? 10 : 0}],
                    key: index,
                    ref: (ref: Ref) => {
                        radioButtonsRef.current[index] = ref
                    }, //set ref
                })
            });
        })
    }, [children])

    /* 點擊 */
    const press = (index: number) => {
        //切換單選按鈕狀態
        radioButtonsRef.current.forEach((ref, key) => {
            ref.setSelected(key === index)
        })

        const correct = radioButtonsRef.current.find((ref, key) => key === index)
        setTimeout(() => {
            correct && onPress(correct.getValue()) //點擊callback
        }, ANIME_TIME) //當動畫結束後才呼叫
    }

    return (
        <View style={[{flexDirection: layout}, style.container, containerStyle]}>
            {radioButtons}
        </View>
    )
}

const style = StyleSheet.create({
    container: {
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
    },
    border: {
        borderStyle: 'solid',
        borderColor: Color.darkColorLight,
        width: '100%',
        height: '100%',
        borderRadius: 50,
        position: 'relative',
    },
    center: {
        borderStyle: 'solid',
        borderRadius: 50,
        width: '100%',
        height: '100%',
        position: 'absolute',
        transform: [{scale: 0.75}]
    }
})
export {RadioButton, RadioGroup};