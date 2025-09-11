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
import {Decimal} from 'decimal.js';

/** @type {import('../module/SQLite').SettingType} SettingType */

const ExportPDF = () => {
    const theme = useTheme();

    const [setting, setting_force_refresh] = useSetting();
    const [remark, setRemark] = useState(false); //是否包含備註
    const [year, setYear] = useState(''); //選擇年份
    const [month, setMonth] = useState(''); //選擇月份
    const [year_opt, setYearOpt] = useState([]); //年份選項
    const [month_opt, setMonthOpt] = useState([]); //月份選項
    const [ok_dialog_visible, setOkDialogVisible] = useState(false); //成功動畫
    const chose_type = useRef(null); //匯出類型
    const to_company = useRef(null);
    /** @type {{setting_force_refresh_alert?: number}} */
    const route_params_context = useContext(RouteParamsContext);

    // 重新整理資料
    useEffect(() => {
        if (route_params_context && route_params_context.setting_force_refresh_alert) {
            console.log('重新整理資料');
            setting_force_refresh();
        }
    }, [route_params_context, setting_force_refresh]);

    // 取得 致... 公司名稱
    useEffect(() => {
        const getToCompanyName = async () => {
            try {
                return await AsyncStorage.getItem('toCompanyName');
            } catch (e) {
                console.log('Read toCompanyName error: ', e);
            }
        };

        getToCompanyName().then(to_company_name => {
            if (to_company_name != null) {
                to_company.current = to_company_name;
            }
        });
    }, []);

    // 取得有資料的月份
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

    // 取得有資料的年份
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
                        await getMonth(rs.rows.item(0).Year);
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

    // 更新月份選項
    useEffect(() => {
        getMonth(year).then();
    }, [getMonth, year]);

    // 彈出窗口
    const doExport = useCallback(
        async type => {
            if (month === '' || year === '') {
                ToastAndroid.show('沒有任何資料', ToastAndroid.SHORT);
                return;
            }

            //開始匯出
            const startExport = async text => {
                try {
                    to_company.current = text;
                    await AsyncStorage.setItem('toCompanyName', text);
                } catch (e) {
                    console.error('Save Daft error: ', e);
                }

                let mouth_rate = setting.Rate; //使用設定檔的匯率, 若該月有匯率則覆蓋

                //取得該月的匯率 (出現頻率最高的)
                try {
                    await DB.readTransaction(async tr => {
                        const [, rs] = await tr.executeSql(
                            `
                                SELECT ifnull(Rate, 0) as 'Rate', COUNT('Rate') as 'count'
                                FROM Record
                                WHERE STRFTIME('%m', DateTime) = ?
                                  AND STRFTIME('%Y', DateTime) = ?
                                GROUP BY Rate
                                ORDER BY count DESC;`,
                            [month, year],
                        );
                        //todo: test
                        const rate = rs.rows.item(0).Rate;
                        if (rs.rows.length > 0 && rate !== null && rate !== 0) mouth_rate = rs.rows.item(0).Rate; //使用該月的匯率
                    });
                } catch (e) {
                    console.error('取得匯率錯誤: ', e);
                }

                //開始匯出
                try {
                    const [html, total] = await getRecordHTML(remark, month, year, mouth_rate);

                    const file_name =
                        setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月(' + to_company.current + ')';

                    setOkDialogVisible(true); //成功動畫 start
                    sound.play(); // Play the sound

                    // 生成pdf
                    const results = await HTMLtoPDF.convert({
                        html: htmlData(month + '月 ' + year, total, html, to_company.current, setting, mouth_rate),
                        fileName: file_name,
                        directory: '../cache',
                        width: 842,
                        height: 595,
                    });

                    // wait animation end
                    setTimeout(async () => {
                        //移動檔案到暫存目錄
                        let save_path = CachesDirectoryPath + '/' + file_name + '.pdf';
                        await RNFS.copyFile(results.filePath, save_path); //先複製度暫存目錄
                        await RNFS.unlink(results.filePath); //delete tmp file

                        if (chose_type.current === 1) {
                            //以電郵傳送
                            Mailer.mail(
                                {
                                    subject: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                    recipients: [setting['Email-to']],
                                    body: `致 ${to_company.current}:\n\n${setting['company-name-ZH']} ${month}月的月結單, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                    attachments: [
                                        {
                                            path: save_path, // The absolute path of the file from which to read data.
                                            type: 'pdf', // Mime Type: jpg, png, doc, ppt, html, pdf, csv
                                        },
                                    ],
                                },
                                (error, event) => {
                                    console.log(error, event);
                                    ToastAndroid.show('出現錯誤: ' + error, ToastAndroid.SHORT);
                                },
                            );
                        } else if (chose_type.current === 2) {
                            //分享
                            const res = await Share.open({
                                url: 'file://' + save_path,
                                message: `致 ${to_company.current}:\n\n${setting['company-name-ZH']} ${month}月的月結單, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                title: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                subject: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                email: setting['Email-to'],
                                type: 'application/pdf',
                                failOnCancel: false,
                            }).catch(error => console.log('Share Error: ', error));
                            console.log(res);
                        } else if (chose_type.current === 3) {
                            //打印
                            await RNPrint.print({filePath: save_path, isLandscape: true});
                        } else if (chose_type.current === 4) {
                            //預覽
                            await FileViewer.open(save_path, {
                                showOpenWithDialog: true,
                                showAppsSuggestions: true,
                            });
                        }

                        setOkDialogVisible(false); //成功動畫 end
                    }, 1000);
                } catch (e) {
                    ToastAndroid.show('出現錯誤: ' + e.message, ToastAndroid.SHORT);
                    console.error('出現錯誤: ', e);
                    setOkDialogVisible(false); //成功動畫 end
                }
            };

            chose_type.current = type;
            prompt('致...', '請輸入收件人名稱', [{text: '取消'}, {text: '確認', onPress: startExport}], {
                cancelable: true,
                defaultValue: to_company.current,
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
                    {year_opt}
                </Picker>
                <Picker
                    style={{flex: 1}}
                    selectedValue={month}
                    onValueChange={itemValue => setMonth(itemValue)}
                    dropdownIconColor={theme.colors.text}
                    prompt={'選擇月份'}>
                    {month_opt}
                </Picker>
            </View>
            <View style={STYLE.buttonGroup}>
                <Button icon={'email-fast-outline'} mode={'outlined'} onPress={() => doExport(1)} style={STYLE.button}>
                    電郵傳送
                </Button>
                <Button icon={'share'} mode={'outlined'} onPress={() => doExport(2)} style={STYLE.button}>
                    分享
                </Button>
                <Button icon={'printer'} mode={'outlined'} onPress={() => doExport(3)} style={STYLE.button}>
                    打印
                </Button>
                <Button icon={'eye'} mode={'contained'} onPress={() => doExport(4)} style={STYLE.button}>
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
                <Dialog visible={ok_dialog_visible} dismissable={false}>
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

/**
 * 套入html模板
 * @param date {string} 日期
 * @param total {number} 總計
 * @param html_body {string} html內容
 * @param to_company_name {string} 致... 公司名稱
 * @param setting {SettingType} 設定檔
 * @param mouth_rate {number|null} 該月匯率, null則使用設定檔的匯率
 * @returns {string} 完整html
 */
function htmlData(date, total, html_body, to_company_name, setting, mouth_rate = null) {
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
        <div>致 ${to_company_name}</div>
        <div style="flex-grow: 1"></div>
        <div style=" margin-right: 1.2rem">${date}</div>
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
    ${html_body}
    </tbody>
    <tfoot>
    <tr>
        <td colspan="5">匯率: 100 港幣 = ${new Decimal(100).mul(mouth_rate ?? setting.Rate).toFixed(2)} 人民幣</td>
        <td colspan="6" style="text-align: right; font-size: 1.5em">總計: HK$ ${formatPrice(total)}</td>
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

/**
 * 格式化數字, 若為0則回傳空字串
 * @param num {number} 數字
 * @param sign {string} 貨幣符號
 * @returns {string} 格式化後的字串
 */
function blankNum(num, sign) {
    if (num === 0) {
        return '';
    } else {
        return sign + ' ' + formatPrice(num.toFixed(2));
    }
}

/**
 * 取得紀錄的html
 * @param is_output_remark {boolean} 是否輸出備註
 * @param output_date_month {string} 月份
 * @param output_date_year {string} 年份
 * @param rate {string} 匯率
 * @returns {Promise<[string, number]>} Promise，resolve 參數為 [html內容, 總計金額]
 */
function getRecordHTML(is_output_remark, output_date_month, output_date_year, rate) {
    return new Promise(async resolve => {
        await DB.readTransaction(async function (tr) {
            console.log('顯示: ', output_date_month, output_date_year);
            const [, rs] = await tr.executeSql(
                "SELECT * FROM Record WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ? ORDER BY DateTime",
                [output_date_month, output_date_year],
            );

            if (rs.rows.length <= 0) {
                throw new Error('沒有資料');
            }

            let total = {
                month: new Decimal(0),
                rmb: new Decimal(0),
                hkd: new Decimal(0),
                add: new Decimal(0),
                shipping: new Decimal(0),
                change: new Decimal(0),
            };
            let html = '';

            // 打印紀錄
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
                const rowRMB = new Decimal(row.RMB);
                const rowHKD = new Decimal(row.HKD);
                const rowAdd = new Decimal(row.Add);
                const rowShipping = new Decimal(row.Shipping);

                let change = new Decimal(0);
                if (rowRMB.gt(0)) {
                    change = rowRMB.div(row.Rate ?? rate).toDecimalPlaces(2);
                }

                let row_total = change.plus(rowHKD).plus(rowAdd).plus(rowShipping);
                total.month = total.month.plus(row_total);
                let row_total_str = blankNum(row_total.toNumber(), '$');
                total.rmb = total.rmb.plus(rowRMB);
                let rmb_str = blankNum(rowRMB.toNumber(), 'CN¥');
                total.change = total.change.plus(change);
                let change_str = blankNum(change.toNumber(), '$');
                total.hkd = total.hkd.plus(rowHKD);
                let hkd_str = blankNum(rowHKD.toNumber(), '$');
                total.add = total.add.plus(rowAdd);
                let add_str = blankNum(rowAdd.toNumber(), '$');
                total.shipping = total.shipping.plus(rowShipping);
                let shipping_str = blankNum(rowShipping.toNumber(), '$');
                //放入html
                html += `
                    <tr>
                        <th scope="row">${row.DateTime.format('D')}</th>
                        <td>${row.OrderNum}</td>
                        <td>${row.CargoNum}</td>
                        <td>${row.Type}</td>
                        <td>${row.Local}<br>
                            <span style="color: grey">${
                                is_output_remark ? (row.Remark === null ? '' : row.Remark) : ''
                            }</span>
                        </td>
                        <td>${rmb_str}</td>
                        <td>${change_str}<br>
                            <small style="color: grey">${
                                rmb_str !== '' && row.Rate !== null && row.Rate !== rate
                                    ? 'HK$100 = CN¥' + new Decimal(100).mul(row.Rate).toFixed(2)
                                    : ''
                            }</small>
                        </td>
                        <td>${hkd_str}</td>
                        <td>${add_str}</td>
                        <td>${shipping_str}</td>
                        <td>${row_total_str}</td>
                    </tr>`;
            }
            html += `
                <tr style="font-size: 1.1em; background-color: lightskyblue">
                    <th scope="row" colspan="5" style="text-align: center">各項總計</th>
                    <td style="border-left: 1px solid lightgray">CN¥ ${formatPrice(total.rmb.toFixed(2))}</td>
                    <td>$ ${formatPrice(total.change.toFixed(2))}</td>
                    <td style="border-right: 1px solid lightgray">$ ${formatPrice(total.hkd.toFixed(2))}</td>
                    <td>$ ${formatPrice(total.add.toFixed(2))}</td>
                    <td style="border-width: 0">$ ${formatPrice(total.shipping.toFixed(2))}</td>
                    <td> </td>
                </tr>`;
            resolve([html, total.month.toFixed(2)]);
        });
    });
}

const STYLE = StyleSheet.create({
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
