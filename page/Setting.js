import React, {useCallback, useEffect, useReducer, useState} from 'react';
import {Appbar, Button, Dialog, Divider, IconButton, List, Portal, Provider as PaperProvider, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {SafeAreaView, ScrollView, StyleSheet, useColorScheme, View} from 'react-native';
import DB from '../module/SQLite';
import TextInput from '../module/TextInput';

const initialState = {
    'Rate': '0.836',
    'company-name-ZH': '公司名稱',
    'company-name-EN': 'Company Name',
    'Driver-name': '陳大明',
    'Driver-license': 'RT XXXX',
    'Email-to': 'mail@example.com',
    'AutoBackup': 'Off',
    'AutoBackup_cycle': 'day'
};
const Dialog_initialState = {
    title: '',
    placeholder: '',
    updatingField: null,
    value: null
};
//更新類型
const [UPDATE_RATE, UPDATE_NAME_ZH, UPDATE_NAME_EN, UPDATE_DRIVER, UPDATE_LICENSE, UPDATE_EMAIL, UPDATE_VALUE] = [0, 1, 2, 3, 4, 5, 6];

/* 更新處理器 */
const reducer = (state, action) => {
    switch(action.type){
        case UPDATE_RATE:
            return {...state, 'Rate': action.payload};
        case UPDATE_NAME_ZH:
            return {...state, 'company-name-ZH': action.payload};
        case UPDATE_NAME_EN:
            return {...state, 'company-name-EN': action.payload};
        case UPDATE_DRIVER:
            return {...state, 'Driver-name': action.payload};
        case UPDATE_LICENSE:
            return {...state, 'Driver-license': action.payload};
        case UPDATE_EMAIL:
            return {...state, 'Email-to': action.payload};
        case UPDATE_VALUE:
            return {...state, value: action.payload};
        default:
            return {...state, ...action.payload};
    }
};

const Setting = ({route}) => {
    let theme = useTheme();
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: Color.indigo
        }
    };
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;

    const [state, dispatch] = useReducer(reducer, initialState); //setting value
    const [DialogState, DialogDispatch] = useReducer(reducer, Dialog_initialState); //Dialog
    const [DialogVisible, setDialogVisible] = useState(false); //彈出視窗

    /* get setting value */
    useEffect(() => {
        DB.transaction(function(tr){
            tr.executeSql('SELECT * FROM Setting', [], function(tx, rs){
                let Setting = [];
                for(let i = 0 ; i < rs.rows.length ; i++){
                    Setting[rs.rows.item(i).Target] = rs.rows.item(i).value;
                }
                dispatch({payload: Setting});
            }, function(error){
                console.log('獲取失敗: ' + error.message); //debug
            });
        }, function(error){
            console.log('傳輸錯誤: ' + error.message); //debug
        });
    }, []);

    /* 彈出窗口 */
    const showDialog = useCallback((type) => {
        setDialogVisible(true);
        let payload = {
            title: '',
            placeholder: '',
            updatingField: type,
            value: null
        };

        switch(type){
            case UPDATE_RATE:
                payload.title = '人民幣匯率';
                payload.placeholder = '請輸入1港元兌人民幣匯率';
                payload.value = state['Rate'];
                break;
            case UPDATE_NAME_ZH:
                payload.title = '中文公司名稱';
                payload.placeholder = '請輸入中文公司名稱';
                payload.value = state['company-name-ZH'];
                break;
            case UPDATE_NAME_EN:
                payload.title = '英文公司名稱';
                payload.placeholder = '請輸入英文公司名稱';
                payload.value = state['company-name-EN'];
                break;
            case UPDATE_DRIVER:
                payload.title = '司機名稱';
                payload.placeholder = '請輸入司機名稱';
                payload.value = state['Driver-name'];
                break;
            case UPDATE_LICENSE:
                payload.title = '車牌號碼';
                payload.placeholder = '請輸入車牌號碼';
                payload.value = state['Driver-license'];
                break;
            case UPDATE_EMAIL:
                payload.title = '收件人';
                payload.placeholder = '請輸入預設收件人電郵地址';
                payload.value = state['Email-to'];
                break;
        }

        DialogDispatch({payload});
    }, [state]);

    /* 隱藏彈出窗口 */
    const hideDialog = useCallback(() => {
        setDialogVisible(false);
    }, []);

    /* 確認修改 */
    const confirm = useCallback(() => {

    }, []);

    return (
        <PaperProvider theme={theme}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header style={{backgroundColor: route.color}}>
                    <Appbar.Content title={route.title} color={Color.white}/>
                </Appbar.Header>
                <ScrollView>
                    <List.Section>
                        <List.Subheader style={style.header}>匯率</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item onPress={() => showDialog(UPDATE_RATE)} style={style.item}
                                       title={'1 港幣 = ' + state['Rate'] + ' 人民幣'} description={'點擊更改'}
                                       right={(props) => <IconButton icon={'reload'} {...props}/>}
                            />
                        </View>
                    </List.Section>
                    <List.Section>
                        <List.Subheader style={style.header}>公司名稱</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item style={style.item} onPress={() => showDialog(
                                UPDATE_NAME_ZH)} title={state['company-name-ZH']} description={'中文名稱'}/>
                            <Divider/>
                            <List.Item style={style.item} onPress={() => showDialog(
                                UPDATE_NAME_EN)} title={state['company-name-EN']} description={'英文名稱'}/>
                        </View>
                    </List.Section>
                    <List.Section>
                        <List.Subheader style={style.header}>司機資料</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item style={style.item} onPress={() => showDialog(
                                UPDATE_DRIVER)} title={state['Driver-name']} description={'司機名稱'}/>
                            <Divider/>
                            <List.Item style={style.item} onPress={() => showDialog(
                                UPDATE_LICENSE)} title={state['Driver-license']} description={'車牌號碼'}/>
                        </View>
                    </List.Section><List.Section>
                    <List.Subheader style={style.header}>電子郵件</List.Subheader>
                    <View style={[style.Section, {backgroundColor: BG_color}]}>
                        <List.Item style={style.item} onPress={() => showDialog(
                            UPDATE_EMAIL)} title={state['Email-to']} description={'預設收件人電郵地址'}/>
                    </View>
                </List.Section>
                    <List.Section>
                        <List.Subheader style={style.header}>存檔</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item style={style.item} title={'備份'} description={'點擊進入備份設定介面'}/>
                            <Divider/>
                            <List.Item style={style.item} title={'更換其他存檔'} description={'點擊更換'}/>
                        </View>
                    </List.Section>
                </ScrollView>
                <Portal>
                    <Dialog visible={DialogVisible} onDismiss={hideDialog}>
                        <Dialog.Title>{DialogState.title}</Dialog.Title>
                        <Dialog.Content>
                            <TextInput placeholder={DialogState.placeholder} dense={true} value={DialogState.value}
                                       onChangeText={(text) => DialogDispatch({type: UPDATE_VALUE, payload: text})}/>
                        </Dialog.Content>
                        <Dialog.Actions>
                            <Button onPress={confirm}>確認</Button>
                            <Button onPress={hideDialog}>取消</Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>
            </SafeAreaView>
        </PaperProvider>
    );
};

const style = StyleSheet.create({
    padding: {
        paddingHorizontal: 10
    },
    Section: {
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: Color.darkColorLight
    },
    item: {
        paddingVertical: 0
    },
    header: {
        paddingBottom: 5
    }
});
export {Setting};