import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react";
import {Animated, StyleSheet, TouchableNativeFeedback, useColorScheme, View} from "react-native";
import {TouchableNativeFeedbackPresets} from "./styles";
import {Color} from "./Color";
import {Text} from "react-native-paper";

const ANIME_TIME = 300; //動畫時間

/* 單選按鈕 */
const RadioButton = forwardRef(({
                                    size = 24,
                                    color,
                                    onCheck = () => {},
                                    label = '',
                                    selected = false,
                                    value = '',
                                    labelStyle,
                                    containerStyle,
                                    layout = 'row',
                                }, ref) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const [isSelected, setIsSelected] = useState(selected);

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
    }) //顏色 mapping

    /* 執行動畫 */
    useEffect(() => {
        if(isSelected){
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

    /* ref function */
    useImperativeHandle(ref, () => ({
        //設置選取
        setSelected: (status) => {
            setIsSelected(status)
        },
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

/* 單選按鈕組合 */
const RadioGroup = ({onPress = () => {}, containerStyle, layout = 'row', children}) => {

    /* radioButtons ref */
    let radioButtonsRef = {}
    children.forEach((child) => {
        radioButtonsRef[child.props.value] = useRef(null)
    })

    /* 複製element, 設置props */
    const radioButtons = children.map((child, index) => {
        return React.cloneElement(child, {
            onCheck: (status) => status && press(child.props.value),
            selected: !!child.props.selected,
            containerStyle: [child.props.containerStyle, {marginLeft: layout === 'row' && index !== 0 ? 10 : 0}],
            key: child.props.value,
            ref: radioButtonsRef[child.props.value] //set ref
        })
    });

    /* 點擊 */
    const press = (value) => {
        //切換單選按鈕狀態
        for(const [key, ref] of Object.entries(radioButtonsRef)){
            ref.current.setSelected(key === value);
        }
        onPress(value) //點擊callback
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