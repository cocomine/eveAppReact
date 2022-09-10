import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaView, View} from 'react-native';
import {Appbar, Button, Checkbox, Provider as PaperProvider, Text, Title, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {Picker} from '@react-native-picker/picker';
import {useFocusEffect} from '@react-navigation/native';
import DB from '../module/SQLite';

const Export = ({route}) => {
    let theme = useTheme();
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: Color.orange
        }
    };

    const [remark, setRemark] = useState(false); //是否包含備註
    const [year, setYear] = useState(''); //選擇年份
    const [month, setMonth] = useState(''); //選擇月份
    const [YearOpt, setYearOpt] = useState([]); //年份選項
    const [MonthOpt, setMonthOpt] = useState([]); //月份選項

    /* 取得有資料的年份 */
    useFocusEffect(useCallback(() => {
        DB.transaction(function(tr){
            tr.executeSql('SELECT DISTINCT STRFTIME(\'%Y\', DateTime) AS Year FROM Record ORDER BY Year DESC', [], function(tx, rs){
                let tmp = [];
                for(let i = 0 ; i < rs.rows.length ; i++){
                    const row = rs.rows.item(i);
                    tmp.push(<Picker.Item label={row.Year + '年'} value={row.Year} color={theme.colors.text}/>);
                }

                //填充選項
                setYearOpt(tmp);
                setYear(rs.rows.item(0).Year);
                getMonth(rs.rows.item(0).Year);
            }, function(tx, error){
                console.log('取得資料錯誤: ' + error.message);
            });
        }, function(error){
            console.log('傳輸錯誤: ' + error.message);
        }, function(){
            console.log('已取得有資料的年份');
        });
    }, []));

    /* 取得有資料的月份 */
    const getMonth = useCallback((year) => {
        DB.transaction(function(tr){
            tr.executeSql(
                'SELECT DISTINCT STRFTIME(\'%m\', DateTime) AS Month FROM Record WHERE STRFTIME(\'%Y\', DateTime) = ? ORDER BY Month DESC', [year],
                function(tx, rs){
                    let tmp = [];
                    for(let i = 0 ; i < rs.rows.length ; i++){
                        const row = rs.rows.item(i);
                        tmp.push(<Picker.Item label={row.Month + '月'} value={row.Month} color={theme.colors.text}/>);
                    }

                    //填充選項
                    setMonthOpt(tmp);
                    setMonth(rs.rows.item(0).Month);
                }, function(tx, error){
                    console.log('取得資料錯誤: ' + error.message);
                }
            );
        }, function(error){
            console.log('傳輸錯誤: ' + error.message);
        }, function(){
            console.log('已取得有資料的月份');
        });
    }, []);

    /* 更新月份選項 */
    useEffect(() => getMonth(year), [year]);

    return (
        <PaperProvider theme={theme}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header style={{backgroundColor: route.color}}>
                    <Appbar.Content title={'匯出'} color={Color.white}/>
                </Appbar.Header>
                <React.StrictMode>
                    <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
                        <Title>選擇匯出月份</Title>
                        <View style={{flexDirection: 'row'}}>
                            <Picker style={{flex: 1 / 3}} selectedValue={year}
                                    onValueChange={(itemValue) => setYear(itemValue)}
                                    dropdownIconColor={theme.colors.text} prompt={'選擇年份'}>
                                {YearOpt}
                            </Picker>
                            <Picker style={{flex: 1 / 3}} selectedValue={month}
                                    onValueChange={(itemValue) => setMonth(itemValue)}
                                    dropdownIconColor={theme.colors.text} prompt={'選擇月份'}>
                                {MonthOpt}
                            </Picker>
                        </View>
                        <View style={{flexDirection: 'row'}}>
                            <Button icon={'email-send-outline'} mode={'outlined'} onPress={() => null} style={{
                                flex: 1,
                                marginRight: 5
                            }}>以電郵傳送</Button>
                            <Button icon={'printer'} mode={'contained'} onPress={() => null} style={{flex: 1}}>匯出 或 打印</Button>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', width: '100%'}}>
                            <Checkbox status={remark ? 'checked' : 'unchecked'} onPress={() => {
                                setRemark(!remark);
                            }} color={theme.colors.primary}/><Text>包含備註</Text>
                        </View>
                    </View>
                </React.StrictMode>
            </SafeAreaView>
        </PaperProvider>
    );
};

export {Export};