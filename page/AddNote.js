import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {KeyboardAvoidingView, SafeAreaView, StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import {Appbar, Text, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import moment from 'moment';
import TextInput from '../module/TextInput';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import Animated, {SlideInDown, SlideOutDown} from 'react-native-reanimated';
import {convertColor} from './Note';

const initialState = {
    date: new Date(),
    id: null,
    top: false,
    title: null,
    content: null,
    color: null
};

/* 顏色列表 */
const colorList = [null, 'red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple', 'pink', 'brown', 'gray'];

/* 更新處理器 */
const reducer = (state, action) => {
    return {...state, ...action};
};

const AddNote = ({navigation, route}) => {
    const {colors} = useTheme();

    const [state, dispatch] = useReducer(reducer, initialState);
    const [showColorSelector, setShowColorSelector] = useState(false);
    const contentInput = useRef(null);

    //debug
    useEffect(() => {
        console.log(route);
    }, [route]);

    const closeColorSelector = useCallback(() => {
        setShowColorSelector(false);
    }, []);

    return (
        <SafeAreaView style={{flex: 1}}>
            <React.StrictMode>
                <View style={{flex: 1}}>
                    <Appbar style={{backgroundColor: Color.primaryColor}}>
                        <Appbar.BackAction onPress={navigation.goBack} color={Color.white}/>
                        <Appbar.Content title={'備忘錄'}/>
                        <Appbar.Action icon={'palette-outline'} onPress={() => setShowColorSelector(prev => !prev)}/>
                        <Appbar.Action icon={'pin-outline'} onPress={() => null}/>
                        {route.params != null ? <Appbar.Action icon={'delete-outline'} onPress={() => null}/> : null}
                    </Appbar>
                    <KeyboardAvoidingView style={{padding: 20, backgroundColor: convertColor(state.color), flex: 1}} behavior={'height'}>
                        <Text style={style.date} onPress={() => null} onPressOut={() => {
                            DateTimePickerAndroid.open({
                                value: state.date, onChange: (event, newDate) => {
                                    dispatch({date: newDate});
                                }
                            });
                        }}>{moment(state.date).locale('zh-hk').format('D.M (ddd)')}</Text>
                        <TextInput placeholder={'Title'} style={{fontWeight: 'bold'}} value={state.title} onSubmitEditing={() => contentInput.current.focus()}
                                   onChangeText={(text) => dispatch({title: text})} selectionColor={Color.primaryColor} onFocus={closeColorSelector}
                                   underlineColor={Color.transparent} activeUnderlineColor={Color.transparent} returnKeyType={'next'}/>
                        <TextInput placeholder={'內容'} style={[style.contentInput,
                            {height: undefined}]} value={state.content} onFocus={closeColorSelector}
                                   onChangeText={(text) => dispatch({content: text})} multiline={true} selectionColor={Color.primaryColor}
                                   underlineColor={Color.transparent} activeUnderlineColor={Color.transparent} maxLength={200} ref={contentInput}/>
                    </KeyboardAvoidingView>
                </View>
                {showColorSelector ?
                    <TouchableWithoutFeedback onPress={() => setShowColorSelector(false)}>
                        <View style={style.colorSelectOut}>
                            <Animated.View style={[style.colorSelect,
                                {backgroundColor: colors.background}]} entering={SlideInDown} exiting={SlideOutDown}>
                                {colorList.map((color, index) =>
                                    <TouchableWithoutFeedback onPress={() => dispatch({color: color})}>
                                        <View style={style.colorBox}>
                                            <View style={[style.colorOut, state.color === color ? {borderColor: Color.primaryColor} : null]}>
                                                <View style={[style.color,
                                                              color === null ? {
                                                                  borderWidth: .7,
                                                                  borderColor: Color.darkColorLight
                                                              } : {backgroundColor: convertColor(color)}
                                                ]}/>
                                            </View>
                                        </View>
                                    </TouchableWithoutFeedback>
                                )}
                            </Animated.View>
                        </View>
                    </TouchableWithoutFeedback>
                    : null}
            </React.StrictMode>
        </SafeAreaView>
    );
};

const style = StyleSheet.create({
    contentInput: {
        textAlignVertical: 'top',
        width: '100%',
        flex: 1,
        marginBottom: 10
    },
    colorBox: {
        width: '25%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    colorOut: {
        width: 50,
        height: 50,
        borderRadius: 50,
        padding: 5,
        borderWidth: .7,
        borderColor: Color.transparent
    },
    color: {
        flex: 1,
        borderRadius: 50
    },
    date: {
        color: Color.darkColorLight,
        borderWidth: .7,
        borderColor: Color.darkColorLight,
        borderRadius: 5,
        padding: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start'
    },
    colorSelectOut: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        justifyContent: 'flex-end'
    },
    colorSelect: {
        flex: 1 / 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignContent: 'stretch',
        flexWrap: 'wrap'
    }
});
export {AddNote};