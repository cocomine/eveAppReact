import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react";
import {Animated, StyleProp, StyleSheet, TextStyle, TouchableNativeFeedback, useColorScheme, View, ViewStyle} from "react-native";
import {TouchableNativeFeedbackPresets} from "./styles";
import {Color} from "./Color";
import {Text} from "react-native-paper";

const ANIME_TIME = 300; //動畫時間

/* 單選按鈕 輸入參數 */
interface Props {
    size?: number,
    color: string | number,
    onCheck?: (check: boolean) => void,
    label?: string,
    selected?: boolean,
    value: string,
    labelStyle?: StyleProp<TextStyle>,
    containerStyle?: StyleProp<ViewStyle>,
    layout?: 'row' | 'column',
}

/* 單選按鈕 參考方法 */
type Ref = {
    setSelected: (status: boolean) => void,
    getValue: () => string | number
}

/* 單選按鈕 介面 */
interface RadioButtonComponent extends React.ForwardRefExoticComponent<Props & React.RefAttributes<Ref>> {
    setSelected: (status: boolean) => void
}


/* 單選按鈕 */
const RadioButton = forwardRef<Ref, Props>(({
                                                size = 24,
                                                color,
                                                onCheck = () => {
                                                },
                                                label = '',
                                                selected = false,
                                                value,
                                                labelStyle,
                                                containerStyle,
                                                layout = 'row',
                                            }, ref) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const [isSelected, setIsSelected] = useState(false);

    /* 轉換點擊狀態 */
    const onPress = () => {
        //點擊callback
        setIsSelected((prev) => {
            onCheck(!prev);
            return !prev;
        });
    }

    /* 轉換動畫 */
    const border = useRef(new Animated.Value(3)).current; //邊框
    const center = useRef(new Animated.Value(0)).current; //中心
    const borderColor = useRef(new Animated.Value(1)).current; //顏色
    let b_color = borderColor.interpolate({
        inputRange: [0, 1],
        outputRange: [Color.darkColorLight, color]
    } as Animated.InterpolationConfigType) //顏色 mapping

    /* 執行動畫 */
    useEffect(() => {
        if (isSelected) {
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
            }).start()
        }else{
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
            }).start();
        }
    }, [isSelected]);

    /* 放入預設文字 */
    useEffect(() => {
        setIsSelected(selected)
    }, [selected])

    /* ref function */
    useImperativeHandle(ref, () => ({
        //設置選取
        setSelected: (status) => {
            setIsSelected(status)
        },
        getValue: () => value
    }));

    return (
        <View style={[style.container, containerStyle, {flexDirection: layout}]}>
            <TouchableNativeFeedback {...TouchableNativeFeedbackPresets.borderless} onPress={onPress}>
                <View style={{width: size, height: size}}>
                    <Animated.View style={[style.border, {borderWidth: border, borderColor: b_color}]}/>
                    <Animated.View style={[style.center, {
                        borderWidth: center,
                        borderColor: isDarkMode ? Color.darkColor : Color.light
                    }]}/>
                </View>
            </TouchableNativeFeedback>
            <Text style={[labelStyle, {marginLeft: layout === 'row' ? 4 : 0}]} onPress={onPress}>{label}</Text>
        </View>
    )
});

/* 單選按鈕組合 輸入參數 */
interface GroupProps {
    onPress?: (value: string | number) => void,
    containerStyle?: StyleProp<ViewStyle>,
    layout?: 'row' | 'column',
    selectValue: string | number,
    children: React.ReactElement<Props, typeof RadioButton>[]
}

/* 單選按鈕組合 */
const RadioGroup: React.FC<GroupProps> = ({
                                              onPress = () => {
                                              },
                                              containerStyle,
                                              layout = 'row',
                                              selectValue,
                                              children
                                          }) => {

    /* radioButtons ref */
    const radioButtonsRef: Ref[] = [];
    const [radioButtons, setRadioButtons] = useState<React.ReactElement[]>([]);

    /* 複製element, 設置props */
    useEffect(() => {
        const radioButtons = children.map((child, index) => {
            return React.cloneElement(child, {
                onCheck: (status: boolean) => press(index),
                selected: selectValue === child.props.value,
                containerStyle: [child.props.containerStyle, {marginLeft: layout === 'row' && index !== 0 ? 10 : 0}],
                key: index,
                ref: (ref: Ref) => {
                    radioButtonsRef[index] = ref
                }, //set ref
            })
        });
        setRadioButtons(radioButtons);
    }, [selectValue]);

    /* 點擊 */
    const press = (index: number) => {
        //切換單選按鈕狀態
        radioButtonsRef.forEach((ref, key) => {
            ref.setSelected(key === index)
        })
        const correct = radioButtonsRef.find((ref, key) => key === index)
        correct && onPress(correct.getValue()) //點擊callback
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