import React, {forwardRef, useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {
    Animated,
    BackHandler,
    Keyboard,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    ToastAndroid,
    TouchableWithoutFeedback,
    useColorScheme,
    useWindowDimensions,
    View,
} from 'react-native';
import moment from 'moment';
import {Color} from '../module/Color';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {DecimalInput} from '../module/NumInput';
import {NumKeyboard} from '../module/NumKeyboard';
import TextInput from '../module/TextInput';
import {Button, HelperText, Text} from 'react-native-paper';
import TextInputMask from 'react-native-text-input-mask';
import {RadioButton, RadioGroup} from '../module/RadioButton';
import {DB, useSetting} from '../module/SQLite';
import ErrorHelperText from '../module/ErrorHelperText';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState = {
    date: new Date(),
    orderID: '',
    type: '40',
    cargoLetter: '',
    cargoNum: '',
    cargoCheckNum: '',
    location: '',
    RMB: 0,
    HKD: 0,
    ADD: 0,
    shipping: 0,
    remark: '',
    error: {
        cargo: null,
        location: null,
        orderID: null,
    },
};
//更新類型
const [UPDATE_DATE, UPDATE_ORDER_ID, UPDATE_TYPE, UPDATE_CARGO_LETTER,
    UPDATE_CARGO_NUM, UPDATE_CARGO_CHECK_NUM, UPDATE_LOCATION, UPDATE_RMB,
    UPDATE_HKD, UPDATE_ADD, UPDATE_SHIPPING, UPDATE_REMARK,
    SET_ERROR] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/* 更新處理器 */
const reducer = (state, action) => {
    switch(action.type){
        case UPDATE_DATE:
            return {
                ...state,
                date: action.payload.date
            };
        case UPDATE_ORDER_ID:
            return {
                ...state,
                orderID: action.payload.orderID
            };
        case UPDATE_TYPE:
            return {
                ...state,
                type: action.payload.type
            };
        case UPDATE_CARGO_LETTER:
            return {
                ...state,
                cargoLetter: action.payload.cargoLetter
            };
        case UPDATE_CARGO_NUM:
            return {
                ...state,
                cargoNum: action.payload.cargoNum
            };
        case UPDATE_CARGO_CHECK_NUM:
            return {
                ...state,
                cargoCheckNum: action.payload.cargoCheckNum
            };
        case UPDATE_LOCATION:
            return {
                ...state,
                location: action.payload.location
            };
        case UPDATE_RMB:
            return {
                ...state,
                RMB: action.payload.RMB
            };
        case UPDATE_HKD:
            return {
                ...state,
                HKD: action.payload.HKD
            };
        case UPDATE_ADD:
            return {
                ...state,
                ADD: action.payload.ADD
            };
        case UPDATE_SHIPPING:
            return {
                ...state,
                shipping: action.payload.shipping
            };
        case UPDATE_REMARK:
            return {
                ...state,
                remark: action.payload.remark
            };
        case SET_ERROR:
            return {
                ...state,
                error: {
                    ...action.payload.error
                }
            };
        default:
            return {
                ...state,
                ...action.payload
            };
    }
};

/* 增加紀錄 */
const AddRecord = ({navigation, route}) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const [state, dispatch] = useReducer(reducer, initialState); //輸入資料
    const focusingDecInput = useRef(null); //目前聚焦銀碼輸入框
    const needSaveDraft = useRef(true); //是否儲存草稿
    const [setting] = useSetting(); //設定
    const Rate = parseFloat(setting ? setting.Rate : 0);
    const [scrollOffset, setScrollOffset] = useState(0); //滾動位移

    //textInput refs
    let inputs = useRef({
        orderID: null,
        CargoLetter: null,
        CargoNum: null,
        CargoCheckNum: null,
        local: null,
        RMB: null,
        HKD: null,
        ADD: null,
        shipping: null,
        remark: null
    });
    let NumKeyboard_refs = useRef(null);

    /* 對焦到下一個輸入欄 */
    const focusNextField = useCallback((id) => {
        inputs.current[id].focus();
    }, []);

    /* 對焦金錢輸入欄 => 打開虛擬鍵盤 */
    const DecimalInput_Focus = useCallback((id) => {
        Keyboard.dismiss();
        focusingDecInput.current = id;
        NumKeyboard_refs.current.openKeyBoard();
    }, []);

    /* 失焦金錢輸入欄 => 關閉虛擬鍵盤 */
    const DecimalInput_Blur = useCallback(() => {
        focusingDecInput.current = null;
        NumKeyboard_refs.current.closeKeyBoard();
    }, []);

    /* 虛擬鍵盤點擊 */
    const onKeyPress = useCallback((value) => {
        if(focusingDecInput.current){
            if(value === 'back') inputs.current[focusingDecInput.current].setText(inputs.current[focusingDecInput.current].getText().slice(0, -1)); //刪除最後一個文字
            else if(value === 'done') focusNextField(Object.keys(inputs.current)[Object.keys(inputs.current).indexOf(focusingDecInput.current) + 1]); //完成輸入
            else if(value === 'calculator') navigation.navigate('calculator', {inputID: focusingDecInput.current, pageID: route.name}); //跳轉到計算機
            else inputs.current[focusingDecInput.current].setText(inputs.current[focusingDecInput.current].getText() + value); //輸入文字
        }
    }, []);

    /* 遞交 */
    const submit = useCallback(() => {
        let error = {
            cargo: null,
            location: null,
            orderID: null
        };

        //檢查條件
        if(state.orderID.length > 0 && state.orderID.length < 9){
            error.orderID = '未完成填寫';
        }
        if(state.cargoLetter.length <= 0 || state.cargoNum.length <= 0 || state.cargoCheckNum.length <= 0){
            error.cargo = '必須填寫';
        }else if(state.cargoLetter.length < 4 || state.cargoNum.length < 6 || state.cargoCheckNum.length < 1){
            error.cargo = '未完成填寫';
        }/*else if(!CargoNumCheck(state.cargoLetter, state.cargoNum, parseInt(state.cargoCheckNum))){
            error.cargo = '填寫錯誤';
        }*/
        if(state.location.length <= 0){
            error.location = '必須填寫';
        }

        dispatch({type: SET_ERROR, payload: {error: {...error}}});
        if(Object.values(error).findIndex((value) => value !== null) >= 0) return; //是否全部已通過

        //通過放入資料庫
        const CargoNum = state.cargoLetter + state.cargoNum + state.cargoCheckNum;
        DB.transaction(function(tr){
            tr.executeSql(
                'INSERT INTO Record (`DateTime`, OrderNum, Type, CargoNum, Local, RMB, HKD, `Add`, Shipping, Remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [moment(state.date).format('yyyy-MM-DD'), state.orderID, state.type,
                 CargoNum, state.location, state.RMB, state.HKD, state.ADD, state.shipping, state.remark]
            );
        }, function(error){
            console.log('傳輸錯誤: ' + error.message); //debug
        }, function(){
            needSaveDraft.current = false;
            AsyncStorage.removeItem('Draft').then();
            navigation.navigate('Main', {ShowDay: state.date.toString()}); //go back home
        });
    }, [state]);

    /* 計算機返回輸入欄位id */
    useEffect(() => {
        if(route.params && route.params.value && route.params.inputID){
            inputs.current[route.params.inputID].setText(route.params.value.toString());
        }
    }, [route]);

    /* 讀取草稿 */
    useEffect(() => {
        //讀取
        const getDraft = async() => {
            try{
                const draft = await AsyncStorage.getItem('Draft');
                await AsyncStorage.removeItem('Draft');
                return draft != null ? JSON.parse(draft) : null;
            }catch(e){
                console.log('Read Daft error: ', e);
            }
        };

        //處理
        getDraft().then((draft) => {
            if(draft != null){
                draft.date = new Date(draft.date);
                dispatch({payload: {...draft}});
            }
        });
    }, []);

    /* 處理返回按鈕 */
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if(focusingDecInput.current !== null){ //打開了自定義數字鍵盤行為
                inputs.current[focusingDecInput.current].blur();
                return true;
            }
        });

        //清除活動監聽器
        return () => backHandler.remove();
    }, [focusingDecInput]);

    /* 處理退出頁面 儲存草稿 */
    useEffect(() => {
        //儲存
        const storeDraft = async() => {
            try{
                let draft = JSON.stringify(state);
                await AsyncStorage.setItem('Draft', draft);
                ToastAndroid.show('已儲存為草稿', ToastAndroid.SHORT);
            }catch(e){
                console.log('Save Daft error: ', e);
            }
        };

        //處理
        return navigation.addListener('beforeRemove', () => { //清除活動監聽器
            if(needSaveDraft.current) storeDraft().then(); //儲存草稿
        });
    }, [navigation, state]);

    /* 滾動事件 */
    const scroll = useCallback(({nativeEvent}) => {
        setScrollOffset(nativeEvent.contentOffset.y);
    }, []);

    //debug
    // useEffect(() => {
    //     console.log(setting);
    // });

    return (
        <SafeAreaView style={{flex: 1}}>
            {/*<React.StrictMode>*/}
            <StatusBar backgroundColor={Color.primaryColor} barStyle={'light-content'} animated={true}/>
            <ScrollView nestedScrollEnabled={true} onScroll={scroll} keyboardShouldPersistTaps={'handled'}>
                <View style={[style.Data, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                    {/* 日期 */}
                    <View style={style.formGroup}>
                        <Text style={{flex: 1 / 5}}>日期</Text>
                        <TextInput caretHidden={true} showSoftInputOnFocus={false} contextMenuHidden={true} onPressOut={() => {
                            Keyboard.dismiss();
                            DateTimePickerAndroid.open({
                                value: state.date, onChange: (event, newDate) => {
                                    focusNextField('orderID');
                                    dispatch({type: UPDATE_DATE, payload: {date: newDate}});
                                }
                            });
                        }} value={moment(state.date).format('D/M/yyyy')} style={{flex: 1}}/>
                    </View>
                    {/* 單號 */}
                    <View style={style.formGroup}>
                        <Text style={{flex: 1 / 5}}>單號</Text>
                        <View style={{flex: 1}}>
                            <TextInput placeholder={'03/09/020'} keyboardType="numeric" returnKeyType={'next'} maxLength={9}
                                       onSubmitEditing={() => focusNextField('CargoLetter')} ref={(ref) => inputs.current.orderID = ref}
                                       onBlur={(text) => dispatch({type: UPDATE_ORDER_ID, payload: {orderID: text}})}
                                       render={props => <TextInputMask {...props} mask={'[00]/[00]/[000]'}/>}
                                       error={state.error.orderID !== null} value={state.orderID}
                            />
                            <ErrorHelperText visible={state.error.orderID !== null}>{state.error.orderID}</ErrorHelperText>
                        </View>
                    </View>
                    {/* 類型 */}
                    <View style={style.formGroup}>
                        <Text style={{flex: 1 / 5}}>類型</Text>
                        <RadioGroup containerStyle={{justifyContent: 'space-between', flex: 1}}
                                    onPress={(value) => dispatch({type: UPDATE_TYPE, payload: {type: value}})}>
                            <RadioButton value={'20'} label={'20'} color={Color.primaryColor} selected={state.type === '20'}/>
                            <RadioButton value={'40'} label={'40'} color={Color.primaryColor} selected={state.type === '40'}/>
                            <RadioButton value={'45'} label={'45'} color={Color.primaryColor} selected={state.type === '45'}/>
                        </RadioGroup>
                    </View>
                    {/* 櫃號 */}
                    <View style={style.formGroup}>
                        <Text style={{flex: 1 / 5}}>櫃號</Text>
                        <View style={[{flex: 1}, style.Flex_row]}>
                            <View style={{flex: 1 / 2, marginRight: 4}}>
                                <TextInput error={state.error.cargo !== null} value={state.cargoLetter}
                                           placeholder={'AAAA'} returnKeyType={'next'} maxLength={4}
                                           onSubmitEditing={() => focusNextField('CargoNum')}
                                           ref={(ref) => inputs.current.CargoLetter = ref}
                                           onChangeText={(text) => {
                                               dispatch({type: UPDATE_CARGO_LETTER, payload: {cargoLetter: text.toUpperCase()}});
                                           }}
                                           render={props => <TextInputMask {...props} selectTextOnFocus={true} mask={'[AAAA]'}/>}
                                />
                                <ErrorHelperText visible={state.error.cargo !== null}>{state.error.cargo}</ErrorHelperText>
                            </View>
                            <View style={{flex: 1, marginRight: 4}}>
                                <TextInput placeholder={'000000'} keyboardType="numeric" returnKeyType={'next'}
                                           maxLength={6} error={state.error.cargo !== null} value={state.cargoNum}
                                           onSubmitEditing={() => focusNextField('CargoCheckNum')}
                                           onChangeText={(text) => {dispatch({type: UPDATE_CARGO_NUM, payload: {cargoNum: text}});}}
                                           ref={(ref) => inputs.current.CargoNum = ref}
                                           render={props => <TextInputMask {...props} mask={'[000000]'}/>}
                                />
                                <ErrorHelperText visible={state.error.cargo !== null}>{}</ErrorHelperText>
                            </View>
                            <Text>(</Text>
                            <View style={{flex: 1 / 4}}>
                                <TextInput placeholder={'0'} keyboardType="numeric" returnKeyType={'next'} value={state.cargoCheckNum}
                                           maxLength={1} error={state.error.cargo !== null} style={{textAlign: 'center', marginHorizontal: 2}}
                                           onSubmitEditing={() => focusNextField('local')}
                                           onChangeText={(text) => dispatch({type: UPDATE_CARGO_CHECK_NUM, payload: {cargoCheckNum: text}})}
                                           ref={(ref) => inputs.current.CargoCheckNum = ref}
                                           render={props => <TextInputMask {...props} mask={'[0]'}/>}
                                />
                                <ErrorHelperText visible={state.error.cargo !== null}>{}</ErrorHelperText>
                            </View>
                            <Text>)</Text>
                        </View>
                    </View>
                    {/* 地點 */}
                    <View style={style.formGroup}>
                        <Text style={{flex: 1 / 5}}>地點</Text>
                        <LocalInput ref={(ref) => {inputs.current.local = ref;}} value={state.location}
                                    onChangeText={(text) => dispatch({type: UPDATE_LOCATION, payload: {location: text}})}
                                    onSubmitEditing={() => focusNextField('RMB')} error={state.error.location}
                                    scrollOffset={scrollOffset}
                        />
                    </View>
                    {/* 人民幣 */}
                    <View style={style.formGroup}>
                        <Text style={{flex: 1 / 5}}>人民幣</Text>
                        <View style={[{flex: 1}, style.Flex_row]}>
                            <View style={{flex: 1, marginRight: 4}}>
                                <DecimalInput ref={(ref) => {inputs.current.RMB = ref;}} containerStyle={{flex: 1}}
                                              inputStyle={style.formInput} placeholder={'¥ --'} inputProps={{showSoftInputOnFocus: false}}
                                              onValueChange={(value) => dispatch({type: UPDATE_RMB, payload: {RMB: value}})}
                                              symbol={'¥ '} keyboardRef={NumKeyboard_refs} onFocus={() => DecimalInput_Focus('RMB')}
                                              onBlur={DecimalInput_Blur} value={state.RMB}
                                />
                                <HelperText>匯率: 1 港幣 = {Rate} 人民幣</HelperText>
                            </View>
                            <Text>折算 HK$ {(state.RMB / Rate).toFixed(2)}</Text>
                        </View>
                    </View>
                    {/* 港幣 */}
                    <View style={style.formGroup}>
                        <Text style={{flex: 1 / 5}}>港幣</Text>
                        <DecimalInput ref={(ref) => {inputs.current.HKD = ref;}} containerStyle={{flex: 1}} value={state.HKD}
                                      inputStyle={style.formInput} placeholder={'$ --'} inputProps={{showSoftInputOnFocus: false}}
                                      onValueChange={(value) => dispatch({type: UPDATE_HKD, payload: {HKD: value}})}
                                      symbol={'$ '} onFocus={() => DecimalInput_Focus('HKD')} onBlur={DecimalInput_Blur}
                        />
                    </View>
                    {/* 加收&運費 */}
                    <View style={style.formGroup}>
                        <View style={[{flex: 1 / 2}, style.Flex_row]}>
                            <Text style={{flex: 1 / 2}}>加收</Text>
                            <DecimalInput ref={(ref) => {inputs.current.ADD = ref;}} containerStyle={{flex: 1}} value={state.ADD}
                                          inputStyle={style.formInput} placeholder={'$ --'} inputProps={{showSoftInputOnFocus: false}}
                                          onValueChange={(value) => dispatch({type: UPDATE_ADD, payload: {ADD: value}})}
                                          symbol={'$ '} onFocus={() => DecimalInput_Focus('ADD')} onBlur={DecimalInput_Blur}
                            />
                        </View>
                        <View style={[{flex: 1 / 2}, style.Flex_row]}>
                            <Text style={{flex: 1 / 2}}>運費</Text>
                            <DecimalInput ref={(ref) => {inputs.current.shipping = ref;}} containerStyle={{flex: 1}} value={state.shipping}
                                          inputStyle={style.formInput} placeholder={'$ --'} inputProps={{showSoftInputOnFocus: false}}
                                          onValueChange={(value) => dispatch({type: UPDATE_SHIPPING, payload: {shipping: value}})}
                                          symbol={'$ '} onFocus={() => DecimalInput_Focus('shipping')} onBlur={DecimalInput_Blur}
                            />
                        </View>
                    </View>
                </View>
                {/* 備註 */}
                <View style={[style.Remark, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                    <View style={[style.formGroup, {marginTop: -10}]}>
                        <TextInput ref={(ref) => {inputs.current.remark = ref;}} label={'備註'} returnKeyType={'done'} maxLength={50}
                                   value={state.remark} onChangeText={(text) => dispatch({type: UPDATE_REMARK, payload: {remark: text}})}
                                   style={{flex: 1}}
                        />
                    </View>
                </View>
                {/* 儲存 */}
                <View style={[style.Remark, {backgroundColor: isDarkMode ? Color.darkBlock : Color.white}]}>
                    <View style={[style.Flex_row, {justifyContent: 'space-between'}]}>
                        <Text>合計</Text>
                        <Text style={{color: Color.primaryColor, fontSize: 20}}>
                            HK$ {(state.shipping + state.ADD + state.HKD + state.RMB / Rate).toFixed(2)}
                        </Text>
                    </View>
                    <Button icon={'content-save-outline'} mode={'contained'} onPress={submit}>儲存</Button>
                </View>
            </ScrollView>
            <NumKeyboard ref={NumKeyboard_refs} onKeyPress={onKeyPress}/>
            {/*</React.StrictMode>*/}
        </SafeAreaView>
    );
};

/* 地點input */
const LocalInput = forwardRef(({value, onSubmitEditing, error = null, scrollOffset, onChangeText}, ref) => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const [autoComplete, setAutoComplete] = useState([]); //自動完成
    const [inputText, setInputText] = useState('');
    const [showList, setShowList] = useState(false);
    const [upDown, setUpDown] = useState('down'); //列表在上方顯示還在下方顯示
    const deviceHeight = useWindowDimensions().height; //
    const [keybordHeight, set_keybordHeight] = useState(0); //
    const isFocus = useRef(false); //是否聚焦
    const aref = useRef(null); //列表ref

    /* 文字被更改 */
    const onChange = (text) => {
        setInputText(text);
        onChangeText(text);
    };

    /* 聚焦 */
    const onFocus = () => {
        isFocus.current = true;
    };

    /* 向數據庫取數據 */
    useEffect(() => {
        if(!isFocus.current) return; //非聚焦狀態不處理
        DB.transaction(function(tr){
            tr.executeSql('SELECT DISTINCT Local FROM Record WHERE Local LIKE ? LIMIT 10', ['%' + inputText + '%'], function(tx, rs){
                if(rs.rows.length <= 0 || inputText.length <= 0){
                    switchShowList(false);
                }else{
                    switchShowList(true);
                    let val = [];
                    for(let i = 0 ; i < rs.rows.length ; i++){
                        val.push(rs.rows.item(i).Local);
                    }
                    setAutoComplete(val);
                }
            });
        }, function(error){
            console.log('傳輸錯誤: ' + error.message); //debug
        });
    }, [inputText]);

    /* 預設文字 */
    useEffect(() => {
        setInputText(value);
    }, [value]);

    /* 關閉自動完成, 並且儲存值 */
    function closeAndSave(callback){
        switchShowList(false, () => {
            callback && callback();
        });
    }

    /* 自動完成 表列文字 */
    const ListText = ({item}) => {
        let wordIndex = item.search(new RegExp(inputText, 'i'));

        let first = item.substring(0, wordIndex);
        let correct = item.substring(wordIndex, wordIndex + inputText.length); //符合文字
        let last = item.substring(wordIndex + inputText.length);

        return (
            <Text>
                <Text>{first}</Text>
                <Text style={{color: Color.primaryColor}}>{correct}</Text>
                <Text>{last}</Text>
            </Text>
        );
    };

    /* 開啟動畫 */
    const fade = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    /* 切換開啟關閉狀態 */
    function switchShowList(setShow, callback = () => null){
        if(setShow){
            //開啟
            setShowList(true);
            Animated.timing(fade, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true
            }).start();
            Animated.timing(scale, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true
            }).start();
        }else{
            //關閉
            Animated.timing(fade, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start();
            Animated.timing(scale, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true
            }).start(() => {
                setShowList(false);
                callback();
                setUpDown('down');
            });
        }
    }

    /* 判斷空間是否充足 */
    useEffect(() => {
        if(!showList) return;

        const x = setTimeout(() => {
            aref.current.measure((fx, fy, w, h, px, py) => {
                const tmp = deviceHeight - keybordHeight - py - h - (upDown === 'up' ? h : 0); //如果已處於上方, 則再減高度
                // console.log(deviceHeight, keybordHeight, py, h, scrollOffset);
                // console.log(tmp, tmp <= 10);
                // 如果下方空間不夠側跳往上方
                if(tmp <= 10){
                    setUpDown('up');
                }else{
                    setUpDown('down');
                }
            });
        }, 5);

        return () => clearTimeout(x);
    }, [showList, inputText, scrollOffset]);

    /* 取得鍵盤高度 */
    useEffect(() => {
        const showEvent = Keyboard.addListener('keyboardDidShow', e => set_keybordHeight(e.endCoordinates.height));
        const hideEvent = Keyboard.addListener('keyboardDidHide', e => set_keybordHeight(0));

        // 清除事件
        return () => {
            showEvent.remove();
            hideEvent.remove();
        };
    }, []);

    return (
        <View style={{position: 'relative', flex: 1}}>
            <TextInput onChangeText={onChange} value={inputText} autoComplete={'off'}
                       onSubmitEditing={() => closeAndSave(onSubmitEditing)}
                       returnKeyType={'next'} error={error !== null}
                       onBlur={() => closeAndSave()} ref={ref}
                       onFocus={onFocus}
            />
            <ErrorHelperText visible={error !== null}>{error}</ErrorHelperText>
            <Animated.View ref={aref} style={[style.autoComplete, {
                backgroundColor: isDarkMode ? Color.darkColor : Color.white,
                opacity: fade,
                display: showList ? undefined : 'none',
                transform: [{scale}],
                top: upDown === 'up' ? null : '100%',
                bottom: upDown === 'down' ? null : '100%'
            }]}>
                <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps={'always'}>
                    {autoComplete.map((data, index) =>
                        <TouchableWithoutFeedback onPress={() => onChange(data)}>
                            <View key={index} style={{flex: 1, paddingVertical: 8}}>
                                <ListText item={data}/>
                            </View>
                        </TouchableWithoutFeedback>
                    )}
                </ScrollView>
            </Animated.View>
        </View>
    );
});

const style = StyleSheet.create({
    formGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5
    },
    autoComplete: {
        flex: 1,
        maxHeight: 200,
        width: '90%',
        position: 'absolute',
        elevation: 5,
        zIndex: 5,
        borderRadius: 10,
        padding: 5
    },
    Remark: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: .7,
        borderTopWidth: .7,
        marginTop: 10,
        padding: 10,
        elevation: -1
    },
    Data: {
        borderColor: Color.darkColorLight,
        borderBottomWidth: .7,
        padding: 10
    },
    Flex_row: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});
export {AddRecord, LocalInput};
