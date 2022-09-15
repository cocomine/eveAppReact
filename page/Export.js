import React, {useCallback, useEffect, useRef, useState} from 'react';
import {SafeAreaView, StyleSheet, ToastAndroid, View} from 'react-native';
import {Appbar, Button, Checkbox, Dialog, Portal, Provider as PaperProvider, Text, Title, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {Picker} from '@react-native-picker/picker';
import {useFocusEffect} from '@react-navigation/native';
import {DB, useSetting} from '../module/SQLite';
import TextInput from '../module/TextInput';
import moment from 'moment';
import formatPrice from '../module/formatPrice';
import HTMLtoPDF from 'react-native-html-to-pdf';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mailer from 'react-native-mail';
import RNPrint from 'react-native-print';
import Lottie from 'lottie-react-native';
import Sound from 'react-native-sound';
import RNFS, {CachesDirectoryPath, DownloadDirectoryPath} from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';

/* Done sound */
const sound = new Sound('done.mp3', Sound.MAIN_BUNDLE, (error) => {
    if(error){
        console.log('failed to load the sound', error);
    }
});

const Export = ({route}) => {
    let theme = useTheme();
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: route.color
        }
    };

    const [setting] = useSetting();
    const [remark, setRemark] = useState(false); //是否包含備註
    const [year, setYear] = useState(''); //選擇年份
    const [month, setMonth] = useState(''); //選擇月份
    const [YearOpt, setYearOpt] = useState([]); //年份選項
    const [MonthOpt, setMonthOpt] = useState([]); //月份選項
    const [DialogVisible, setDialogVisible] = useState(false); //致... 公司名稱
    const [okDialogVisible, setOkDialogVisible] = useState(false); //成功動畫
    const choseType = useRef(null); //匯出類型
    const [toCompany, setToCompany] = useState(null); //致... 公司名稱

    /* 取得 致... 公司名稱 */
    useEffect(() => {
        const get_toCompanyName = async() => {
            try{
                return await AsyncStorage.getItem('toCompanyName');
            }catch(e){
                console.log('Read toCompanyName error: ', e);
            }
        };

        get_toCompanyName().then((toCompanyName) => {
            if(toCompanyName != null) setToCompany(toCompanyName);
        });
    }, []);

    /* 儲存 致... 公司名稱 */
    useEffect(() => {
        const store_toCompanyName = async() => {
            try{
                await AsyncStorage.setItem('toCompanyName', toCompany);
            }catch(e){
                console.log('Save Daft error: ', e);
            }
        };

        if(toCompany != null) store_toCompanyName().then(() => null);
    }, [toCompany]);

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
                        tmp.push(<Picker.Item label={row.Month + '月'} value={row.Month} color={theme.colors.text} key={i}/>);
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

    /* 彈出窗口 */
    const Export = useCallback((type) => {
        setDialogVisible(true);
        choseType.current = type;
    }, []);

    /* 隱藏彈出窗口 */
    const hideDialog = useCallback(() => {
        setDialogVisible(false);
    }, []);

    /* 確認匯出 */
    const confirm = useCallback(() => {
        getRecordHTML(remark, month, year, setting['Rate'], (html, total) => {
            hideDialog();
            const fileName = setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月(' + toCompany + ')';

            /* 生成pdf */
            const printPDF = async() => {
                return await HTMLtoPDF.convert({
                    html: HTMLData(month + '月 ' + year, total, html, 'abc', setting),
                    fileName: fileName,
                    directory: 'Documents',
                    width: 842,
                    height: 595
                });
            };

            setOkDialogVisible(true); //成功動畫 start
            sound.play(); // Play the sound with an onEnd callback

            printPDF().then(results => {
                setTimeout(() => {
                    setOkDialogVisible(false); //成功動畫 end

                    if(choseType.current === 1){
                        //以電郵傳送
                        let savePath = CachesDirectoryPath + '/' + fileName + '.pdf';

                        RNFS.copyFile(results.filePath, savePath).then(() => { //先複製度暫存目錄
                            RNFS.unlink(results.filePath).then(() => null); //delete tmp file

                            Mailer.mail({
                                subject: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                recipients: [setting['Email-to']],
                                body: `致 ${toCompany}:\n\n${setting['company-name-ZH']} ${month}月的月結單, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                attachments: [{
                                    path: savePath, // The absolute path of the file from which to read data.
                                    type: 'pdf' // Mime Type: jpg, png, doc, ppt, html, pdf, csv
                                }]
                            }, (error) => ToastAndroid.show('出現錯誤: ' + error, ToastAndroid.SHORT));
                        });

                    }else if(choseType.current === 2){
                        //匯出儲存
                        let savePath = DownloadDirectoryPath + '/' + fileName + '.pdf';

                        /* 複製到下載資料夾 */
                        const saveFile = async() => {
                            try{
                                let is_exists = await RNFS.exists(savePath);
                                let verser = 0;
                                if(is_exists){
                                    //已存在檔案
                                    do{
                                        verser++;
                                        savePath = DownloadDirectoryPath + '/' + fileName + ' (' + verser + ') ' + '.pdf';
                                        is_exists = await RNFS.exists(savePath);
                                    }while(is_exists);
                                }

                                await RNFS.copyFile(results.filePath, savePath); //copy
                                return true;
                            }catch(e){
                                return false;
                            }
                        };

                        saveFile().then((e) => {
                            if(e) FileViewer.open(savePath, {showOpenWithDialog: true})
                                            .then(() => ToastAndroid.show('已儲存在下載資料夾中', ToastAndroid.SHORT));
                            else ToastAndroid.show('出現錯誤', ToastAndroid.SHORT);

                            RNFS.unlink(results.filePath).then(() => null); //delete tmp file
                        });
                    }else if(choseType.current === 3){
                        //打印
                        RNPrint.print({filePath: results.filePath, isLandscape: true}).then(() =>
                            RNFS.unlink(results.filePath).then(() => null) //delete tmp file
                        );
                    }

                }, 1000);
            });
        });
    }, [remark, month, year, setting, toCompany]);

    return (
        <PaperProvider theme={theme}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header style={{backgroundColor: route.color}}>
                    <Appbar.Content title={route.title} color={Color.white}/>
                </Appbar.Header>
                {/*<React.StrictMode>*/}
                    <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
                        <Title>選擇匯出月份</Title>
                        <View style={{flexDirection: 'row'}}>
                            <Picker style={{flex: 1}} selectedValue={year}
                                    onValueChange={(itemValue) => setYear(itemValue)}
                                    dropdownIconColor={theme.colors.text} prompt={'選擇年份'}>
                                {YearOpt}
                            </Picker>
                            <Picker style={{flex: 1}} selectedValue={month}
                                    onValueChange={(itemValue) => setMonth(itemValue)}
                                    dropdownIconColor={theme.colors.text} prompt={'選擇月份'}>
                                {MonthOpt}
                            </Picker>
                        </View>
                        <View style={{flexDirection: 'row', paddingHorizontal: 5}}>
                            <Button icon={'email-send-outline'} mode={'outlined'} onPress={() => Export(1)} style={style.button}>以電郵傳送</Button>
                            <Button icon={'export'} mode={'outlined'} onPress={() => Export(2)} style={style.button}>匯出儲存</Button>
                            <Button icon={'printer'} mode={'contained'} onPress={() => Export(3)} style={{flex: 1}}>打印</Button>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', width: '100%'}}>
                            <Checkbox status={remark ? 'checked' : 'unchecked'} onPress={() => {setRemark(!remark);}} color={theme.colors.primary}/>
                            <Text>包含備註</Text>
                        </View>
                    </View>
                    <Portal>
                        <Dialog visible={DialogVisible} dismissable={false}>
                            <Dialog.Title>致...</Dialog.Title>
                            <Dialog.Content>
                                <TextInput placeholder={'請輸入公司名稱'} dense={true} value={toCompany} onChangeText={(text) => setToCompany(text)}/>
                            </Dialog.Content>
                            <Dialog.Actions>
                                <Button onPress={confirm}>確認</Button>
                                <Button onPress={hideDialog}>取消</Button>
                            </Dialog.Actions>
                        </Dialog>
                        <Dialog visible={okDialogVisible} dismissable={false}>
                            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                                <Lottie source={require('../resource/89101-confirmed-tick.json')} autoPlay={true} loop={false} style={{
                                    width: 200,
                                    height: 200
                                }}/>
                            </View>
                        </Dialog>
                    </Portal>
                {/*</React.StrictMode>*/}
            </SafeAreaView>
        </PaperProvider>
    );
};

const style = StyleSheet.create({
    button: {
        flex: 1,
        marginRight: 5
    }
});
export {Export};

/* 套入html模板 */
function HTMLData(Date, Total, HTML_body, toCompanyName, setting){
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PDF_Template</title>
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
        table{
            width: 100%;
            border-collapse: collapse;
        }
        th{
            text-align: left;
        }
        tfoot{
            border-top: 1px solid lightgray;
        }
        h2, h5{
            text-align: center
        }
        #head{
            display: flex; 
            background-color: #a7d086; 
            align-content: center
        }
        #head > div{
            font-size: 1.2em
        }
        #s{
            border-left: 1px solid lightgray; 
            border-right: 1px solid lightgray; 
            text-align: center;
        }
    </style>
</head>
<body>
<h2>${setting['company-name-ZH']}</h2>
<h5>${setting['company-name-EN']}</h5>
<p></p>
<div id="head">
        <div>致 ${toCompanyName}</div>
        <div style="flex-grow: 1"></div>
        <div style=" margin-right: 1.2rem">${Date}</div>
        <div style=" margin-right: 1.2rem">車牌: ${setting['Driver-license']}</div>
        <div>司機: ${setting['Driver-name']}</div>
</div>
<table>
    <thead>
    <tr>
        <th scope="col" colspan="5"></th>
        <th scope="col" colspan="3" id="s">代付</th>
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
        <td colspan="5">匯率: 1 港幣 = ${setting['Rate']} 人民幣</td>
        <td colspan="6" style="text-align: right; font-size: 1.5em">總計: HK$ ${Total}</td>
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
            'SELECT * FROM Record WHERE STRFTIME(\'%m\', DateTime) = ? AND STRFTIME(\'%Y\', DateTime) = ? ORDER BY DateTime',
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
                    //console.log(row); //debug
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