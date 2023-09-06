import {StyleSheet, ToastAndroid, View} from 'react-native';
import {Button, Dialog, Portal, Title, useTheme} from 'react-native-paper';
import React, {useCallback, useEffect, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {DB, useSetting} from '../module/SQLite';
import {Picker} from '@react-native-picker/picker';
import Lottie from 'lottie-react-native';
import {sound} from './Export';
import RNFS, {CachesDirectoryPath, DownloadDirectoryPath} from 'react-native-fs';
import Mailer from 'react-native-mail';
import FileViewer from 'react-native-file-viewer';
import Share from 'react-native-share';
import * as XLSX from 'xlsx-js-style';

const ExportExcel = () => {
    const theme = useTheme();

    const [setting] = useSetting();
    const [mode, setMode] = useState(1); //匯出模式
    const [YearOpt, setYearOpt] = useState([]); //年份選項
    const [okDialogVisible, setOkDialogVisible] = useState(false); //成功動畫

    /* 取得有資料的年份 */
    useFocusEffect(
        useCallback(() => {
            DB.transaction(
                function (tr) {
                    tr.executeSql(
                        "SELECT DISTINCT STRFTIME('%Y', DateTime) AS Year FROM Record ORDER BY Year DESC",
                        [],
                        function (tx, rs) {
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
                        },
                        function (tx, error) {
                            console.log('取得資料錯誤: ' + error.message);
                        },
                    );
                },
                function (error) {
                    console.log('傳輸錯誤: ' + error.message);
                },
                function () {
                    console.log('已取得有資料的年份');
                },
            );
        }, []),
    );

    return (
        <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <Title>選擇匯出範圍</Title>
            <View style={{flexDirection: 'row', paddingBottom: 10}}>
                <Button
                    mode={mode === 0 ? 'contained' : 'outlined'}
                    onPress={() => setMode(0)}
                    style={{borderBottomRightRadius: 0, borderTopRightRadius: 0}}>
                    年
                </Button>
                <Button
                    mode={mode === 1 ? 'contained' : 'outlined'}
                    onPress={() => setMode(1)}
                    style={{borderRadius: 0}}>
                    月
                </Button>
                <Button
                    mode={mode === 2 ? 'contained' : 'outlined'}
                    onPress={() => setMode(2)}
                    style={{borderTopLeftRadius: 0, borderBottomLeftRadius: 0}}>
                    全部
                </Button>
            </View>
            <ExportMonth
                YearOpt={YearOpt}
                theme={theme}
                setting={setting}
                visible={mode === 1}
                onSuccess={isSuccess => setOkDialogVisible(isSuccess)}
            />
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

const ExportMonth = ({YearOpt, theme, setting, onSuccess, visible}) => {
    const [year, setYear] = useState(''); //選擇年份
    const [month, setMonth] = useState(''); //選擇月份
    const [MonthOpt, setMonthOpt] = useState([]); //月份選項

    /* 取得有資料的月份 */
    const getMonth = useCallback(year => {
        DB.transaction(
            function (tr) {
                tr.executeSql(
                    "SELECT DISTINCT STRFTIME('%m', DateTime) AS Month FROM Record WHERE STRFTIME('%Y', DateTime) = ? ORDER BY Month DESC",
                    [year],
                    function (tx, rs) {
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
                    },
                    function (tx, error) {
                        console.log('取得資料錯誤: ' + error.message);
                    },
                );
            },
            function (error) {
                console.log('傳輸錯誤: ' + error.message);
            },
            function () {
                console.log('已取得有資料的月份');
            },
        );
    }, []);

    /* 更新月份選項 */
    useEffect(() => getMonth(year), [year, visible]);

    /* 匯出 */
    const export_ = useCallback(
        type => {
            if (month === '' || year === '') {
                ToastAndroid.show('沒有任何資料', ToastAndroid.SHORT);
                return;
            }

            getRecordArray(month, year, setting.Rate)
                .then(data => {
                    const fileName = setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月';

                    generateExcel(data)
                        .then(filePath => {
                            onSuccess(true); //成功動畫 start
                            sound.play(); // Play the sound with an onEnd callback

                            setTimeout(async () => {
                                onSuccess(false); //成功動畫 end

                                let savePath = DownloadDirectoryPath + '/' + fileName + '.xlsx';
                                console.log(filePath, savePath);
                                await RNFS.copyFile(filePath, savePath); //先複製度暫存目錄
                                await RNFS.unlink(filePath); //delete tmp file

                                if (type === 1) {
                                    //以電郵傳送
                                    Mailer.mail(
                                        {
                                            subject: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                            recipients: [setting['Email-to']],
                                            body: `${setting['company-name-ZH']} ${month}月的Excel, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                            attachments: [
                                                {
                                                    path: savePath, // The absolute path of the file from which to read data.
                                                    mimeType:
                                                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Mime Type: jpg, png, doc, ppt, html, pdf, csv
                                                },
                                            ],
                                        },
                                        (error, event) => {
                                            console.log(error, event);
                                            ToastAndroid.show('出現錯誤: ' + error, ToastAndroid.SHORT);
                                        },
                                    );
                                } else if (type === 2) {
                                    //分享
                                    const res = await Share.open({
                                        url: 'file://' + savePath,
                                        message: `${setting['company-name-ZH']} ${month}月的月結單, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                        title: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                        subject: setting['company-name-ZH'].slice(0, 2) + ' ' + month + '月 月結單',
                                        email: setting['Email-to'],
                                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                    }).catch(error => console.log('Share Error: ', error));
                                    console.log(res);
                                } else if (type === 3) {
                                    //預覽
                                    //await Linking.openURL('file://'+savePath);
                                    await FileViewer.open(savePath, {
                                        showOpenWithDialog: true,
                                        showAppsSuggestions: true,
                                    });
                                }
                            }, 1000);
                        })
                        .catch(error => {
                            ToastAndroid.show('出現錯誤: ' + error, ToastAndroid.SHORT);
                        });
                })
                .catch(error => {
                    ToastAndroid.show('出現錯誤: ' + error, ToastAndroid.SHORT);
                });
        },
        [month, year, setting],
    );

    if (!visible) return null;
    return (
        <View>
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
                <Button icon={'email-send-outline'} mode={'outlined'} onPress={() => export_(1)} style={style.button}>
                    電郵傳送
                </Button>
                <Button icon={'share'} mode={'outlined'} onPress={() => export_(2)} style={style.button}>
                    分享
                </Button>
                <Button icon={'eye'} mode={'contained'} onPress={() => export_(3)} style={style.button}>
                    預覽
                </Button>
            </View>
        </View>
    );
};

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

/* 取得資料 */
function getRecordArray(outputDateMonth, outputDateYear, rate) {
    return new Promise((resolve, reject) => {
        DB.transaction(
            function (tr) {
                tr.executeSql(
                    "SELECT * FROM Record WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ? ORDER BY DateTime",
                    [outputDateMonth, outputDateYear],
                    function (tx, rs) {
                        if (rs.rows.length <= 0) {
                            reject('沒有任何資料');
                            return;
                        }

                        let tmp = [];
                        //todo
                        for (let i = 0; i < rs.rows.length; i++) {
                            const row = rs.rows.item(i);

                            //進行計算
                            let Change = parseFloat((row.RMB / rate).toFixed(2));
                            let rowTotal = Change + row.HKD + row.Add + row.Shipping;

                            //填充資料
                            tmp.push([
                                {v: row.DateTime, t: 'd', z: 'yyyy-mm-dd'},
                                {v: row.OrderNum, t: 's'},
                                {v: row.CargoNum, t: 's'},
                                {v: row.Type, t: 's'},
                                {v: row.Local, t: 's'},
                                {
                                    v: row.RMB,
                                    t: 'n',
                                    z: '_("CN¥"* #,##0.00_);_("CN¥"* (#,##0.00);_("CN¥"* "-"??_);_(@_)',
                                    s: {border: {left: {style: 'thin', color: {rgb: '000000'}}}},
                                },
                                {v: Change, t: 'n', z: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)'},
                                {
                                    v: row.HKD,
                                    t: 'n',
                                    z: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
                                    s: {border: {right: {style: 'thin', color: {rgb: '000000'}}}},
                                },
                                {v: row.Add, t: 'n', z: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)'},
                                {v: row.Shipping, t: 'n', z: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)'},
                                {
                                    v: rowTotal,
                                    t: 'n',
                                    z: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
                                    f: 'SUM(G' + (i + 3) + ':J' + (i + 3) + ')',
                                },
                                {v: row.Remark, t: 's'},
                            ]);
                        }

                        resolve(tmp);
                    },
                    function (tx, error) {
                        console.log('取得資料錯誤: ' + error.message);
                        reject(error);
                    },
                );
            },
            function (error) {
                console.log('傳輸錯誤: ' + error.message);
                reject(error);
            },
            function () {
                console.log('已取得資料');
            },
        );
    });
}

/* excel Heard */
const excelHeard = [
    [
        ...Array.from({length: 12}, (t, i) => {
            if (i === 5)
                return {
                    v: '代付',
                    t: 's',
                    s: {border: {left: {style: 'thin', color: {rgb: '000000'}}}},
                };
            if (i === 7) return {v: '', t: 's', s: {border: {right: {style: 'thin', color: {rgb: '000000'}}}}};
            return {v: '', t: 's'};
        }),
    ],
    [
        {v: '日期', t: 's'},
        {v: '單號', t: 's'},
        {v: '櫃號', t: 's'},
        {v: '類型', t: 's'},
        {v: '地點', t: 's'},
        {
            v: '人民幣',
            t: 's',
            s: {border: {left: {style: 'thin', color: {rgb: '000000'}}}},
        },
        {v: '折算', t: 's'},
        {
            v: '港幣',
            t: 's',
            s: {border: {right: {style: 'thin', color: {rgb: '000000'}}}},
        },
        {v: '加收', t: 's'},
        {v: '運費', t: 's'},
        {v: '合計', t: 's'},
        {v: '備註', t: 's'},
    ],
];

/* 產生excel */
function generateExcel(data) {
    return new Promise((resolve, reject) => {
        try {
            // 填充數據
            data.unshift(...excelHeard);
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);

            // 列寬
            ws['!cols'] = [
                ...Array.from({length: 12}, (t, i) => {
                    if (i === 2) return {wch: 14};
                    if (i === 3) return {wch: 5};
                    if (i === 4 || i === 11) return {wch: 40};
                    return {wch: 11};
                }),
            ];
            ws['!merges'] = [{s: {r: 0, c: 5}, e: {r: 0, c: 7}}]; //合併儲存格

            // 樣式
            const range = XLSX.utils.decode_range('A1:L2');
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = {c: C, r: R};
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    ws[cell_ref].s = {
                        ...ws[cell_ref].s,
                        font: {
                            sz: 12,
                            bold: true,
                        },
                        fill: {
                            fgColor: {rgb: 'd5d5d5'},
                        },
                        alignment: {
                            horizontal: 'center',
                        },
                    };
                }
            }

            // 儲存檔案
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            const savePath = CachesDirectoryPath + '/test.xlsx';
            const wbout = XLSX.write(wb, {type: 'binary', bookType: 'xlsx'});
            RNFS.writeFile(savePath, wbout, 'ascii')
                .then(() => {
                    resolve(savePath);
                })
                .catch(error => {
                    console.log('excel寫入錯誤: ' + error);
                    reject(error);
                });
        } catch (error) {
            console.log('產生excel錯誤: ' + error);
            reject(error);
        }
    });
}

export default ExportExcel;
