import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaView, View} from 'react-native';
import {Appbar, Button, Checkbox, Dialog, Portal, Provider as PaperProvider, Text, Title, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {Picker} from '@react-native-picker/picker';
import {useFocusEffect} from '@react-navigation/native';
import DB, {useSetting} from '../module/SQLite';
import TextInput from '../module/TextInput';
import moment from 'moment';
import formatPrice from '../module/formatPrice';
import HTMLtoPDF from 'react-native-html-to-pdf';
import FileViewer from 'react-native-file-viewer';

const Export = ({route}) => {
    let theme = useTheme();
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: Color.orange
        }
    };

    const [setting] = useSetting();
    const [remark, setRemark] = useState(false); //是否包含備註
    const [year, setYear] = useState(''); //選擇年份
    const [month, setMonth] = useState(''); //選擇月份
    const [YearOpt, setYearOpt] = useState([]); //年份選項
    const [MonthOpt, setMonthOpt] = useState([]); //月份選項
    const [DialogVisible, setDialogVisible] = useState(false);

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

    const Export = useCallback(() => {
        setDialogVisible(true);
    }, []);

    const hideDialog = useCallback(() => {
        setDialogVisible(false);
    }, []);

    const confirm = useCallback(() => {
        getRecordHTML(remark, month, year, setting['Rate'], (html, total) => {
            const printPDF = async() => {
                return await HTMLtoPDF.convert({
                    html: HTMLData('abc', total, html, 'abc', setting),
                    fileName: 'test2',
                    directory: 'Documents',
                    width: 842,
                    height: 595
                });
            };

            printPDF().then(results => {
                console.log(results);
                FileViewer.open(results.filePath, {showOpenWithDialog: true}).then(() => console.log('ok'));

                /*Mailer.mail({
                 subject: 'need help',
                 recipients: ['cocopixelmc@gmail.com'],
                 body: '<b>A Bold Body</b>',
                 isHTML: true,
                 attachments: [{
                 path: results.filePath, // The absolute path of the file from which to read data.
                 //uri: '', // The uri of the file from which to read the data.
                 type: 'pdf', // Mime Type: jpg, png, doc, ppt, html, pdf, csv
                 }]
                 }, (error, event) => {});*/

                //RNPrint.print({filePath: results.filePath, isLandscape: true}).then(() => null)
            });
        });
    }, [remark, MonthOpt, YearOpt, setting]);

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
                            <Button icon={'export'} mode={'outlined'} onPress={() => null} style={{
                                flex: 1,
                                marginRight: 5
                            }}>匯出儲存</Button>
                            <Button icon={'printer'} mode={'contained'} onPress={Export} style={{flex: 1}}>打印</Button>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', width: '100%'}}>
                            <Checkbox status={remark ? 'checked' : 'unchecked'} onPress={() => {
                                setRemark(!remark);
                            }} color={theme.colors.primary}/><Text>包含備註</Text>
                        </View>
                    </View>
                    <Portal>
                        <Dialog visible={DialogVisible} dismissable={false}>
                            <Dialog.Title>致...</Dialog.Title>
                            <Dialog.Content>
                                <TextInput placeholder={'03/09/020'} dense={true}/>
                            </Dialog.Content>
                            <Dialog.Actions>
                                <Button onPress={confirm}>確認</Button>
                                <Button onPress={hideDialog}>取消</Button>
                            </Dialog.Actions>
                        </Dialog>
                    </Portal>
                </React.StrictMode>
            </SafeAreaView>
        </PaperProvider>
    );
};

export {Export};

/* 套入html模板 */
function HTMLData(Date, Total, HTML_body, toCompanyName, setting){
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PDF_Template</title>
    <link rel="stylesheet" href="file:///android_asset/www/css/bootstrap.min.css">
    <style>
        tr > td:nth-child(6) {
            border-left: 1px solid lightgray;
        }

        tr > td:nth-child(8) {
            border-right: 1px solid lightgray;
        }

        tbody > tr:nth-child(2n) {
            background-color: #f3c198;
        }
        body{
            font-size: 10px;
        }
    </style>
</head>
<body>
<h2 style="text-align: center" id="company-name-ZH">${setting['company-name-ZH']}</h2>
<h5 style="text-align: center" id="company-name-EN">${setting['company-name-EN']}</h5>
<p></p>
<div class="row align-items-end" style="background-color: #a7d086">
    <div class="col" style="font-size: 1.5em">致 ${toCompanyName}</div>
    <div class="col-auto" id="Date" style="font-size: 1.2em">${Date}</div>
    <div class="col-auto" id="Driver-license" style="font-size: 1.2em">車牌: ${setting['Driver-license']}</div>
    <div class="col-auto" id="Driver-name" style="font-size: 1.2em">司機: ${setting['Driver-name']}</div>
</div>
<table class="table table-sm">
    <thead>
    <tr>
        <th scope="col" colspan="5"></th>
        <th scope="col" colspan="3" style="border-left: 1px solid lightgray; border-right: 1px solid lightgray; text-align: center">代付</th>
        <th scope="col" colspan="3"></th>
    </tr>
    <tr>
        <th scope="col" >日期</th>
        <th scope="col">單號</th>
        <th scope="col">櫃號</th>
        <th scope="col">類型</th>
        <th scope="col">地點</th>
        <th scope="col" style="border-left: 1px solid lightgray">人民幣</th>
        <th scope="col">折算</th>
        <th scope="col" style="border-right: 1px solid lightgray">港幣</th>
        <th scope="col">加收</th>
        <th scope="col">運費</th>
        <th scope="col">合計</th>
    </tr>
    </thead>
    <tbody>
    ${HTML_body}
    </tbody>
    <tfoot>
    <tr>
        <td colspan="5" id="Rate">匯率: 1 港幣 = ${setting['Rate']} 人民幣</td>
        <td colspan="6" style="text-align: right; font-size: 1.5em" id="monthTotal">總計: HK$ ${Total}</td>
    </tr>
    </tfoot>
</table>
<p style="text-align: center">- 終 -</p>
</body>
<footer>
    <div style="color: gray; font-size: .5em; text-align: right">本PDF檔案由 運輸紀錄 應用程式生成</div>
</footer>
</html>`;
}

/* 數字0替換為空白 */
function blankNum(num, sign){
    if(num === 0){
        return '';
    }else{
        return sign + ' ' + formatPrice(num.toFixed(2));
    }
}

/* 取得當月紀錄*/
function getRecordHTML(isOutputRemark, outputDateMonth, outputDateYear, rate, output, error){
    DB.transaction(function(tr){
        console.log('顯示: ', outputDateMonth, outputDateYear);
        tr.executeSql(
            'SELECT * FROM Record WHERE STRFTIME(\'%m\', DateTime) = ? AND STRFTIME(\'%Y\', DateTime) = ? ORDER BY DateTime ASC',
            [outputDateMonth, outputDateYear], function(tx, rs){
                if(rs.rows.length <= 0){
                    error('沒有資料');
                    return false;
                }
                let Total = {
                    Month: 0.0,
                    RMB: 0.0,
                    HKD: 0.0,
                    ADD: 0.0,
                    Shipping: 0.0,
                    Change: 0.0
                };
                let html = '';

                /* 打印紀錄 */
                for(let i = 0 ; i < rs.rows.length ; i++){
                    const row = rs.rows.item(i);
                    console.log(row); //debug
                    row.DateTime = moment(row.DateTime);
                    row.CargoNum = '<b>' + row.CargoNum.slice(0, 4) + '</b>' + row.CargoNum.slice(4, 10) + '(' + row.CargoNum.slice(10) + ')';

                    //進行計算
                    let Change = parseFloat((row.RMB / rate).toFixed(2));
                    let rowTotal = Change + row.HKD + row.Add + row.Shipping;
                    Total.Month += rowTotal;
                    rowTotal = blankNum(rowTotal, '$');
                    Total.RMB += row.RMB;
                    row.RMB = blankNum(row.RMB, 'CN¥');
                    Total.Change += Change;
                    Change = blankNum(Change, '$');
                    Total.HKD += row.HKD;
                    row.HKD = blankNum(row.HKD, '$');
                    Total.ADD += row.Add;
                    row.Add = blankNum(row.Add, '$');
                    Total.Shipping += row.Shipping;
                    row.Shipping = blankNum(row.Shipping, '$');
                    //console.log(Total); //debug

                    //放入html
                    html += `
                    <tr>
                        <th scope="row">${row.DateTime.format('D')}</th>
                        <td>${row.OrderNum}</td>
                        <td>${row.CargoNum}</td>
                        <td>${row.Type}</td>
                        <td>${row.Local}<br><span style="color: gray">${isOutputRemark ? (row.Remark === null ? '' : row.Remark) : ''}</span></td>
                        <td>${row.RMB}</td>
                        <td>${Change}</td>
                        <td>${row.HKD}</td>
                        <td>${row.Add}</td>
                        <td>${row.Shipping}</td>
                        <td>${rowTotal}</td>
                    </tr>`;
                }
                html += `
                <tr style="font-size: 1.1em; background-color: lightskyblue">
                    <th scope="row" colspan="5" style="text-align: center">各項總計</th>
                    <td style="border-left: 1px solid lightgray">CN¥ ${formatPrice(Total.RMB.toFixed(2))}</td>
                    <td>$ ${formatPrice(Total.Change.toFixed(2))}</td>
                    <td style="border-right: 1px solid lightgray">$ ${formatPrice(Total.HKD.toFixed(2))}</td>
                    <td>$ ${formatPrice(Total.ADD.toFixed(2))}</td>
                    <td style="border-width: 0">$ ${formatPrice(Total.Shipping.toFixed(2))}</td>
                    <td> </td>
                </tr>`;
                output(html, Total.Month.toFixed(2));
                return false;
            }, function(tx, error){
                error('取得資料錯誤: ' + error.message);
            }
        );
    }, function(error){
        error('傳輸錯誤: ' + error.message);
    });
}