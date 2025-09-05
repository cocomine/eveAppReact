import {Button, Checkbox, Dialog, Portal, Text, Title, useTheme} from 'react-native-paper';
import {DB, useSetting} from '../module/SQLite';
import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import {StyleSheet, ToastAndroid, View} from 'react-native';
import HTMLtoPDF from 'react-native-html-to-pdf';
import RNFS, {CachesDirectoryPath} from 'react-native-fs';
import Mailer from 'react-native-mail';
import FileViewer from 'react-native-file-viewer';
import RNPrint from '@cocomine/react-native-print';
import prompt from 'react-native-prompt-android';
import Lottie from 'lottie-react-native';
import formatPrice from '../module/formatPrice';
import Share from 'react-native-share';
import {sound} from './Export';
import moment from 'moment/moment';
import {RouteParamsContext} from '../module/RouteParamsContext';

const ExportPDF = () => {
    const theme = useTheme();

    const [setting, settingForceRefresh] = useSetting();
    const [remark, setRemark] = useState(false); //是否包含備註
    const [year, setYear] = useState(''); //選擇年份
    const [month, setMonth] = useState(''); //選擇月份
    const [YearOpt, setYearOpt] = useState([]); //年份選項
    const [MonthOpt, setMonthOpt] = useState([]); //月份選項
    const [okDialogVisible, setOkDialogVisible] = useState(false); //成功動畫
    const choseType = useRef(null); //匯出類型
    const toCompany = useRef(null);
    /** @type {{settingForceRefreshAlert?: number}} */
    const routeParamsContext = useContext(RouteParamsContext);

    /* 重新整理資料 */
    useEffect(() => {
        if (routeParamsContext && routeParamsContext.settingForceRefreshAlert) {
            console.log('重新整理資料');
            settingForceRefresh();
        }
    }, [routeParamsContext, settingForceRefresh]);

    /* 取得 致... 公司名稱 */
    useEffect(() => {
        const get_toCompanyName = async () => {
            try {
                return await AsyncStorage.getItem('toCompanyName');
            } catch (e) {
                console.log('Read toCompanyName error: ', e);
            }
        };

        get_toCompanyName().then(toCompanyName => {
            if (toCompanyName != null) {
                toCompany.current = toCompanyName;
            }
        });
    }, []);

    /* 取得有資料的月份 */
    const getMonth = useCallback(
        async year1 => {
            try {
                await DB.readTransaction(async function (tr) {
                    const [, rs] = await tr.executeSql(
                        "SELECT DISTINCT STRFTIME('%m', DateTime) AS Month FROM Record WHERE STRFTIME('%Y', DateTime) = ? ORDER BY Month DESC",
                        [year1],
                    );

                    let tmp = [];
                    for (let i = 0; i < rs.rows.length; i++) {
                        const row = rs.rows.item(i);
                        tmp.push(
                            <Picker.Item
                                label={row.Month + '月'}
                                value={row.Month}
                                color={theme.colors.text}
                                key={i}
                            />,
                        );
                    }

                    //填充選項
                    setMonthOpt(tmp);
                    setMonth(rs.rows.item(0).Month);
                });
            } catch (e) {
                console.error('傳輸錯誤: ' + e.message);
                ToastAndroid.show('傳輸錯誤: ' + e.message, ToastAndroid.SHORT);
                return;
            }

            console.log('已取得有資料的月份');
        },
        [theme.colors.text],
    );

    /* 取得有資料的年份 */
    useFocusEffect(
        useCallback(() => {
            const extracted = async () => {
                try {
                    await DB.readTransaction(async function (tr) {
                        const [, rs] = await tr.executeSql(
                            "SELECT DISTINCT STRFTIME('%Y', DateTime) AS Year FROM Record ORDER BY Year DESC",
                            [],
                        );

                        let tmp = [];
                        for (let i = 0; i < rs.rows.length; i++) {
                            const row = rs.rows.item(i);
                            tmp.push(
                                <Picker.Item
                                    label={row.Year + '年'}
                                    value={row.Year}
                                    color={theme.colors.text}
                                    key={i}
                                />,
                            );
                        }

                        //填充選項
                        setYearOpt(tmp);
                        setYear(rs.rows.item(0).Year);
                        getMonth(rs.rows.item(0).Year);
                    });
                } catch (e) {
                    console.error('傳輸錯誤: ' + e.message);
                    ToastAndroid.show('傳輸錯誤: ' + e.message, ToastAndroid.SHORT);
                    return;
                }

                console.log('已取得有資料的年份');
            };

            console.log('畫面聚焦, 重新取得有資料的年份');
            extracted().then();
        }, [getMonth, theme.colors.text]),
    );

    /* 更新月份選項 */
    useEffect(() => {
        getMonth(year).then();
    }, [getMonth, year]);

    /* 彈出窗口 */
    const export_ = useCallback(
        type => {
            /* 確認匯出 */
            const output = () => {
                if (month === '' || year === '') {
                    ToastAndroid.show('沒有任何資料', ToastAndroid.SHORT);
                    return;
                }

                getRecordHTML(remark, month, year, setting.Rate, (html, total) => {
                    const fileName =
                        setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月(' + toCompany.current + ')';

                    /* 生成pdf */
                    const printPDF = async () => {
                        return await HTMLtoPDF.convert({
                            html: HTMLData(month + '月 ' + year, total, html, toCompany.current, setting),
                            fileName: fileName,
                            directory: 'Documents',
                            width: 842,
                            height: 595,
                        });
                    };

                    setOkDialogVisible(true); //成功動畫 start
                    sound.play(); // Play the sound with an onEnd callback

                    printPDF().then(results => {
                        setTimeout(async () => {
                            setOkDialogVisible(false); //成功動畫 end

                            let savePath = CachesDirectoryPath + '/' + fileName + '.pdf';
                            await RNFS.copyFile(results.filePath, savePath); //先複製度暫存目錄
                            await RNFS.unlink(results.filePath); //delete tmp file

                            if (choseType.current === 1) {
                                //以電郵傳送
                                Mailer.mail(
                                    {
                                        subject: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                        recipients: [setting['Email-to']],
                                        body: `致 ${toCompany.current}:\n\n${setting['company-name-ZH']} ${month}月的月結單, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                        attachments: [
                                            {
                                                path: savePath, // The absolute path of the file from which to read data.
                                                type: 'pdf', // Mime Type: jpg, png, doc, ppt, html, pdf, csv
                                            },
                                        ],
                                    },
                                    (error, event) => {
                                        console.log(error, event);
                                        ToastAndroid.show('出現錯誤: ' + error, ToastAndroid.SHORT);
                                    },
                                );
                            } else if (choseType.current === 2) {
                                //分享
                                const res = await Share.open({
                                    url: 'file://' + savePath,
                                    message: `致 ${toCompany.current}:\n\n${setting['company-name-ZH']} ${month}月的月結單, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                    title: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                    subject: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                    email: setting['Email-to'],
                                    type: 'application/pdf',
                                    failOnCancel: false,
                                }).catch(error => console.log('Share Error: ', error));
                                console.log(res);
                            } else if (choseType.current === 3) {
                                //打印
                                await RNPrint.print({filePath: savePath, isLandscape: true});
                            } else if (choseType.current === 4) {
                                //預覽
                                await FileViewer.open(savePath, {
                                    showOpenWithDialog: true,
                                    showAppsSuggestions: true,
                                });
                            }
                        }, 1000);
                    });
                }).catch(e => {
                    ToastAndroid.show('出現錯誤: ' + e.message, ToastAndroid.SHORT);
                });
            };

            /* save toCompanyName */
            const store_toCompanyName = async text => {
                try {
                    toCompany.current = text;
                    await AsyncStorage.setItem('toCompanyName', text);
                    output();
                } catch (e) {
                    console.log('Save Daft error: ', e);
                }
            };

            choseType.current = type;
            prompt('致...', '請輸入收件人名稱', [{text: '取消'}, {text: '確認', onPress: store_toCompanyName}], {
                cancelable: true,
                defaultValue: toCompany.current,
            });
        },
        [month, year, remark, setting],
    );

    return (
        <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <Title>選擇匯出月份</Title>
            <View style={{flexDirection: 'row'}}>
                <Picker
                    style={{flex: 1}}
                    selectedValue={year}
                    onValueChange={itemValue => setYear(itemValue)}
                    dropdownIconColor={theme.colors.text}
                    prompt={'選擇年份'}>
                    {YearOpt}
                </Picker>
                <Picker
                    style={{flex: 1}}
                    selectedValue={month}
                    onValueChange={itemValue => setMonth(itemValue)}
                    dropdownIconColor={theme.colors.text}
                    prompt={'選擇月份'}>
                    {MonthOpt}
                </Picker>
            </View>
            <View style={style.buttonGroup}>
                <Button icon={'email-fast-outline'} mode={'outlined'} onPress={() => export_(1)} style={style.button}>
                    電郵傳送
                </Button>
                <Button icon={'share'} mode={'outlined'} onPress={() => export_(2)} style={style.button}>
                    分享
                </Button>
                <Button icon={'printer'} mode={'outlined'} onPress={() => export_(3)} style={style.button}>
                    打印
                </Button>
                <Button icon={'eye'} mode={'contained'} onPress={() => export_(4)} style={style.button}>
                    預覽
                </Button>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', width: '100%'}}>
                <Checkbox
                    status={remark ? 'checked' : 'unchecked'}
                    onPress={() => {
                        setRemark(!remark);
                    }}
                    color={theme.colors.primary}
                />
                <Text>包含備註</Text>
            </View>
            <Portal>
                <Dialog visible={okDialogVisible} dismissable={false}>
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Lottie
                            source={require('../resource/89101-confirmed-tick.json')}
                            autoPlay={true}
                            loop={false}
                            style={{
                                width: 200,
                                height: 200,
                            }}
                        />
                    </View>
                </Dialog>
            </Portal>
        </View>
    );
};

/* 套入html模板 */
function HTMLData(Date, Total, HTML_body, toCompanyName, setting) {
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
        <td colspan="5">匯率: 100 港幣 = ${(100 * setting.Rate).toFixed(2)} 人民幣</td>
        <td colspan="6" style="text-align: right; font-size: 1.5em">總計: HK$ ${Total}</td>
    </tr>
    </tfoot>
</table>
<p style="text-align: center">- 終 -</p>
</body>
<footer>
    <div style="color: grey; font-size: .5em; text-align: right">本PDF檔案由 運輸紀錄 應用程式生成</div>
</footer>
</html>`;
}

/* 數字0替換為空白 */
function blankNum(num, sign) {
    if (num === 0) {
        return '';
    } else {
        return sign + ' ' + formatPrice(num.toFixed(2));
    }
}

/* 取得當月紀錄*/
async function getRecordHTML(isOutputRemark, outputDateMonth, outputDateYear, rate, output) {
    try {
        await DB.readTransaction(async function (tr) {
            console.log('顯示: ', outputDateMonth, outputDateYear);
            const [, rs] = await tr.executeSql(
                "SELECT * FROM Record WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ? ORDER BY DateTime",
                [outputDateMonth, outputDateYear],
            );

            if (rs.rows.length <= 0) {
                throw new Error('沒有資料');
            }

            let Total = {
                Month: 0.0,
                RMB: 0.0,
                HKD: 0.0,
                ADD: 0.0,
                Shipping: 0.0,
                Change: 0.0,
            };
            let html = '';

            /* 打印紀錄 */
            for (let i = 0; i < rs.rows.length; i++) {
                const row = rs.rows.item(i);
                //console.log(row); //debug
                row.DateTime = moment(row.DateTime);
                row.CargoNum =
                    '<b>' +
                    row.CargoNum.slice(0, 4) +
                    '</b>' +
                    row.CargoNum.slice(4, 10) +
                    '(' +
                    row.CargoNum.slice(10) +
                    ')';

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
                        <td>${row.Local}<br><span style="color: grey">${
                            isOutputRemark ? (row.Remark === null ? '' : row.Remark) : ''
                        }</span></td>
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
        });
    } catch (e) {
        console.error('傳輸錯誤: ' + e.message);
        throw e;
    }
}

const style = StyleSheet.create({
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 5,
        flexWrap: 'wrap',
        rowGap: 5,
    },
    button: {
        width: '45%',
    },
});

export default ExportPDF;
