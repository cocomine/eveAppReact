import React, {useCallback, useEffect, useReducer, useState} from 'react';
import {Appbar, Divider, IconButton, List, Provider as PaperProvider, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    ToastAndroid,
    useColorScheme,
    View,
} from 'react-native';
import {DB, updateSetting, useSetting} from '../module/SQLite';
import {useNavigation} from '@react-navigation/native';
import prompt from 'react-native-prompt-android';

const initialState = {
    Rate: '0.836',
    'company-name-ZH': '公司名稱',
    'company-name-EN': 'Company Name',
    'Driver-name': '陳大明',
    'Driver-license': 'RT XXXX',
    'Email-to': 'mail@example.com',
    AutoBackup: 'Off',
    AutoBackup_cycle: 'day',
};

//更新類型
const [
    UPDATE_RATE,
    UPDATE_NAME_ZH,
    UPDATE_NAME_EN,
    UPDATE_DRIVER,
    UPDATE_LICENSE,
    UPDATE_EMAIL,
    UPDATE_VALUE,
    UPDATE_ERROR,
] = [0, 1, 2, 3, 4, 5, 6, 7];

/* 更新處理器 */
const reducer = (state, action) => {
    switch (action.type) {
        case UPDATE_RATE:
            return {...state, Rate: action.payload};
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
        case UPDATE_ERROR:
            return {...state, error: action.payload};
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
            primary: route.color,
        },
    };
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;
    const navigation = useNavigation();

    const [state, dispatch] = useReducer(reducer, initialState); //setting value
    const [onlineRate_load, set_onlineRate_load] = useState(false);
    const [, forceRefresh] = useSetting();

    /* get setting value */
    useEffect(() => {
        const extracted = async () => {
            try {
                await DB.readTransaction(async tr => {
                    const [, rs] = await tr.executeSql('SELECT * FROM Setting', []);

                    let setting_tmp = {};
                    for (let i = 0; i < rs.rows.length; i++) {
                        setting_tmp[rs.rows.item(i).Target] = rs.rows.item(i).value;
                    }
                    dispatch({payload: setting_tmp});
                });
            } catch (e) {
                console.error('獲取失敗: ' + e.message); //debug
                ToastAndroid.show('獲取失敗', ToastAndroid.SHORT);
            }
        };

        extracted().then();
    }, []);

    /* 彈出窗口 */
    const showDialog = useCallback(
        type => {
            /* 確認修改 */
            const confirm = value => {
                //輸入檢查
                switch (type) {
                    case UPDATE_RATE:
                        if (!/^[0-9]+(\.[0-9]+)?$/g.test(value)) {
                            ToastAndroid.show('輸入格式不正確 必須是數字', ToastAndroid.SHORT);
                            return;
                        } else {
                            //100港元兌人民幣匯率 = 人民幣匯率 / 100
                            value = (value / 100).toFixed(4);
                        }
                        break;
                    case UPDATE_NAME_ZH:
                        if (!/^[\u4e00-\u9fa5\s]+$/g.test(value)) {
                            ToastAndroid.show('只能夠輸入中文', ToastAndroid.SHORT);
                            return;
                        } else {
                            value = value.replace(/\s+/g, ' ').trim(); //多個空格替換成一個並去除前後空格
                        }
                        break;
                    case UPDATE_NAME_EN:
                        if (!/^[a-zA-Z\s]+$/g.test(value)) {
                            ToastAndroid.show('只能夠輸入英文', ToastAndroid.SHORT);
                            return;
                        } else {
                            value = value.replace(/\s+/g, ' ').trim(); //多個空格替換成一個並去除前後空格
                        }
                        break;
                    case UPDATE_DRIVER:
                        if (!/^.+$/g.test(value)) {
                            ToastAndroid.show('司機名稱不能為空', ToastAndroid.SHORT);
                            return;
                        } else {
                            value = value.replace(/\s+/g, ' ').trim(); //多個空格替換成一個並去除前後空格
                        }
                        break;
                    case UPDATE_LICENSE:
                        if (!/^[A-Z0-9\s]+$/g.test(value)) {
                            ToastAndroid.show('只能夠輸入大楷英文和數字', ToastAndroid.SHORT);
                            return;
                        } else {
                            value = value.replace(/\s+/g, ' ').trim(); //多個空格替換成一個並去除前後空格
                        }
                        break;
                    case UPDATE_EMAIL:
                        if (!/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/g.test(value)) {
                            ToastAndroid.show('只能夠輸入電郵地址', ToastAndroid.SHORT);
                            return;
                        }
                        break;
                }

                dispatch({type: type, payload: value});
            };

            let payload = {
                title: '',
                placeholder: '',
                value: null,
            };
            switch (type) {
                case UPDATE_RATE:
                    payload.title = '人民幣匯率';
                    payload.placeholder = '請輸入100港元兌人民幣匯率';
                    payload.value = (100 * state.Rate).toFixed(2);
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

            //彈出視窗
            prompt(payload.title, payload.placeholder, [{text: '取消'}, {text: '確認', onPress: confirm}], {
                cancelable: true,
                defaultValue: payload.value,
            });
        },
        [state],
    );

    /* 線上更新匯率 */
    const onlineRate = useCallback(() => {
        set_onlineRate_load(true);
        fetch(
            'https://exchange-rates.abstractapi.com/v1/live/?api_key=513ff6825b484fa2a9d38df074986a5d&base=HKD&target=CNY',
        )
            .then(response => {
                response.json().then(json => {
                    //console.log(json);
                    const rates = json.exchange_rates.CNY.toFixed(4); //取小數點後4位
                    dispatch({type: UPDATE_RATE, payload: rates});
                });
            })
            .catch(error => {
                ToastAndroid.show('獲取匯率失敗 ' + error, ToastAndroid.SHORT);
            })
            .finally(() => set_onlineRate_load(false));
    }, []);

    /* update database */
    useEffect(() => {
        const extracted = async () => {
            try {
                await DB.transaction(async tr => {
                    const sql_promise = [];
                    for (const obj in state) {
                        sql_promise.push(
                            tr.executeSql('UPDATE Setting SET value = ? WHERE Target = ?', [state[obj], obj]),
                        );
                    }

                    await Promise.all(sql_promise);
                });
            } catch (e) {
                console.error('更新失敗', e.message);
                ToastAndroid('更新失敗', ToastAndroid.SHORT);
                return;
            }

            console.log('更新成功');
            forceRefresh();
        };

        extracted().then();
    }, [forceRefresh, state]);

    //debug
    // useEffect(() => {
    //     console.log(DialogState, state)
    // })

    return (
        <PaperProvider theme={theme}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header style={{backgroundColor: route.color}}>
                    <Appbar.Content title={route.title} color={Color.white} />
                </Appbar.Header>
                {/*<React.StrictMode>*/}
                <ScrollView>
                    <List.Section>
                        <List.Subheader style={style.header}>匯率</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item
                                onPress={() => showDialog(UPDATE_RATE)}
                                style={style.item}
                                title={'100 港幣 = ' + (100 * state.Rate).toFixed(2) + ' 人民幣'}
                                description={'點擊更改'}
                                right={props =>
                                    onlineRate_load ? (
                                        <ActivityIndicator animating={true} size={'large'} {...props} />
                                    ) : (
                                        <IconButton icon={'reload'} {...props} onPress={onlineRate} />
                                    )
                                }
                            />
                        </View>
                    </List.Section>
                    <List.Section>
                        <List.Subheader style={style.header}>公司名稱</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item
                                style={style.item}
                                onPress={() => showDialog(UPDATE_NAME_ZH)}
                                title={state['company-name-ZH']}
                                description={'中文名稱'}
                            />
                            <Divider />
                            <List.Item
                                style={style.item}
                                onPress={() => showDialog(UPDATE_NAME_EN)}
                                title={state['company-name-EN']}
                                description={'英文名稱'}
                            />
                        </View>
                    </List.Section>
                    <List.Section>
                        <List.Subheader style={style.header}>司機資料</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item
                                style={style.item}
                                onPress={() => showDialog(UPDATE_DRIVER)}
                                title={state['Driver-name']}
                                description={'司機名稱'}
                            />
                            <Divider />
                            <List.Item
                                style={style.item}
                                onPress={() => showDialog(UPDATE_LICENSE)}
                                title={state['Driver-license']}
                                description={'車牌號碼'}
                            />
                        </View>
                    </List.Section>
                    <List.Section>
                        <List.Subheader style={style.header}>電子郵件</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item
                                style={style.item}
                                onPress={() => showDialog(UPDATE_EMAIL)}
                                title={state['Email-to']}
                                description={'預設收件人電郵地址'}
                            />
                        </View>
                    </List.Section>
                    <List.Section>
                        <List.Subheader style={style.header}>存檔</List.Subheader>
                        <View style={[style.Section, {backgroundColor: BG_color}]}>
                            <List.Item
                                style={style.item}
                                title={'備份'}
                                description={'點擊進入備份設定介面'}
                                onPress={() => navigation.navigate('Backup')}
                            />
                            <Divider />
                            <List.Item
                                style={style.item}
                                title={'更換其他存檔'}
                                description={'點擊更換'}
                                onPress={() => navigation.navigate('ChangeSave')}
                            />
                        </View>
                    </List.Section>
                </ScrollView>
                {/*</React.StrictMode>*/}
            </SafeAreaView>
        </PaperProvider>
    );
};

const style = StyleSheet.create({
    Section: {
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: Color.darkColorLight,
    },
    item: {
        paddingVertical: 0,
    },
    header: {
        paddingBottom: 5,
    },
});
export {Setting};
