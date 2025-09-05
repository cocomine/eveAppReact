import {StyleSheet, ToastAndroid, View} from 'react-native';
import {Button, Dialog, Portal, Title, useTheme} from 'react-native-paper';
import React, {useCallback, useEffect, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {DB, useSetting} from '../module/SQLite';
import {Picker} from '@react-native-picker/picker';
import Lottie from 'lottie-react-native';
import {sound} from './Export';
import RNFS, {CachesDirectoryPath} from 'react-native-fs';
import Mailer from 'react-native-mail';
import FileViewer from 'react-native-file-viewer';
import Share from 'react-native-share';
import * as XLSX from 'xlsx-js-style';
import moment from 'moment';

const ExportExcel = () => {
    const theme = useTheme();

    const [setting] = useSetting();
    const [mode, setMode] = useState(1); //匯出模式
    const [YearOpt, setYearOpt] = useState([]); //年份選項
    const [okDialogVisible, setOkDialogVisible] = useState(false); //成功動畫

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

                        setYearOpt(rs.rows.raw()); //填充選項
                    });
                } catch (e) {
                    console.error('傳輸錯誤: ' + e.message);
                    ToastAndroid.show('傳輸錯誤: ' + e.message, ToastAndroid.SHORT);
                    return;
                }

                console.log('已取得有資料的年份');
            };

            extracted().then();
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
            <ExportYear
                YearOpt={YearOpt}
                theme={theme}
                setting={setting}
                visible={mode === 0}
                onSuccess={isSuccess => setOkDialogVisible(isSuccess)}
            />
            <ExportAll
                YearOpt={YearOpt}
                theme={theme}
                setting={setting}
                visible={mode === 2}
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

/* 月 */
const ExportMonth = ({YearOpt, theme, setting, onSuccess, visible}) => {
    const [year, setYear] = useState(''); //選擇年份
    const [month, setMonth] = useState(''); //選擇月份
    const [MonthOpt, setMonthOpt] = useState([]); //月份選項

    /* 取得有資料的月份 */
    const getMonth = useCallback(async year1 => {
        try {
            await DB.readTransaction(async function (tr) {
                const [, rs] = await tr.executeSql(
                    "SELECT DISTINCT STRFTIME('%m', DateTime) AS Month FROM Record WHERE STRFTIME('%Y', DateTime) = ? ORDER BY Month DESC",
                    [year1],
                );

                //填充選項
                setMonthOpt(rs.rows.raw);
                setMonth(rs.rows.item(0).Month);
            });
        } catch (e) {
            console.error('傳輸錯誤: ' + e.message);
            ToastAndroid.show('傳輸錯誤: ' + e.message, ToastAndroid.SHORT);
            return;
        }

        console.log('已取得有資料的月份');
    }, []);

    /* 更新月份選項 */
    useEffect(() => {
        getMonth(year).then();
    }, [year, visible, getMonth]);

    /* 更新年份選項 */
    useEffect(() => setYear(YearOpt.length > 0 ? YearOpt[0].Year : ''), [YearOpt]);

    /* 匯出 */
    const export_ = useCallback(
        type => {
            if (month === '' || year === '') {
                ToastAndroid.show('沒有任何資料', ToastAndroid.SHORT);
                return;
            }

            getRecordArray(
                setting.Rate,
                "SELECT * FROM Record WHERE STRFTIME('%m', DateTime) = ? AND STRFTIME('%Y', DateTime) = ? ORDER BY DateTime",
                [month, year],
            )
                .then(data => {
                    const fileName = setting['company-name-ZH'].slice(0, 2) + ' ' + year + '-' + month;

                    generateExcel(data)
                        .then(filePath => {
                            onSuccess(true); //成功動畫 start
                            sound.play(); // Play the sound with an onEnd callback

                            setTimeout(async () => {
                                onSuccess(false); //成功動畫 end

                                let savePath = CachesDirectoryPath + '/' + fileName + '.xlsx';
                                await RNFS.copyFile(filePath, savePath); //先複製度暫存目錄
                                await RNFS.unlink(filePath); //delete tmp file

                                if (type === 1) {
                                    //以電郵傳送
                                    Mailer.mail(
                                        {
                                            subject: setting['company-name-ZH'].slice(0, 2) + ' ' + year + '/' + month,
                                            recipients: [setting['Email-to']],
                                            body: `${setting['company-name-ZH']} ${year}/${month} 的Excel, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
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
                                        message: `${setting['company-name-ZH']} ${year}/${month} 的Excel, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                        title: setting['company-name-ZH'].slice(0, 2) + ' ' + year + '/' + month,
                                        subject: setting['company-name-ZH'].slice(0, 2) + ' ' + year + '/' + month,
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
        [month, year, setting, onSuccess],
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
                    {YearOpt.map((item, index) => (
                        <Picker.Item label={item.Year + '年'} value={item.Year} color={theme.colors.text} key={index} />
                    ))}
                </Picker>
                <Picker
                    style={{flex: 1}}
                    selectedValue={month}
                    onValueChange={itemValue => setMonth(itemValue)}
                    dropdownIconColor={theme.colors.text}
                    prompt={'選擇月份'}>
                    {MonthOpt.map((item, index) => (
                        <Picker.Item
                            label={item.Month + '月'}
                            value={item.Month}
                            color={theme.colors.text}
                            key={index}
                        />
                    ))}
                </Picker>
            </View>
            <View style={style.buttonGroup}>
                <Button icon={'email-fast-outline'} mode={'outlined'} onPress={() => export_(1)} style={style.button}>
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

/* 年 */
const ExportYear = ({YearOpt, theme, setting, onSuccess, visible}) => {
    const [year, setYear] = useState(''); //選擇年份

    /* 更新年份選項 */
    useEffect(() => setYear(YearOpt.length > 0 ? YearOpt[0].Year : ''), [YearOpt]);

    /* 匯出 */
    const export_ = useCallback(
        type => {
            if (year === '') {
                ToastAndroid.show('沒有任何資料', ToastAndroid.SHORT);
                return;
            }

            getRecordArray(setting.Rate, "SELECT * FROM Record WHERE STRFTIME('%Y', DateTime) = ? ORDER BY DateTime", [
                year,
            ])
                .then(data => {
                    const fileName = setting['company-name-ZH'].slice(0, 2) + ' ' + year;

                    generateExcel(data)
                        .then(filePath => {
                            onSuccess(true); //成功動畫 start
                            sound.play(); // Play the sound with an onEnd callback

                            setTimeout(async () => {
                                onSuccess(false); //成功動畫 end

                                let savePath = CachesDirectoryPath + '/' + fileName + '.xlsx';
                                await RNFS.copyFile(filePath, savePath); //先複製度暫存目錄
                                await RNFS.unlink(filePath); //delete tmp file

                                if (type === 1) {
                                    //以電郵傳送
                                    Mailer.mail(
                                        {
                                            subject: setting['company-name-ZH'].slice(0, 2) + ' ' + year,
                                            recipients: [setting['Email-to']],
                                            body: `${setting['company-name-ZH']} ${year} 的Excel, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
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
                                        message: `${setting['company-name-ZH']} ${year} 的Excel, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                        title: setting['company-name-ZH'].slice(0, 2) + ' ' + year,
                                        subject: setting['company-name-ZH'].slice(0, 2) + ' ' + year,
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
        [year, setting, onSuccess],
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
                    {YearOpt.map((item, index) => (
                        <Picker.Item label={item.Year + '年'} value={item.Year} color={theme.colors.text} key={index} />
                    ))}
                </Picker>
            </View>
            <View style={style.buttonGroup}>
                <Button icon={'email-fast-outline'} mode={'outlined'} onPress={() => export_(1)} style={style.button}>
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

/* 全部 */
const ExportAll = ({YearOpt, theme, setting, onSuccess, visible}) => {
    /* 匯出 */
    const export_ = useCallback(
        type => {
            if (YearOpt.length <= 0) {
                ToastAndroid.show('沒有任何資料', ToastAndroid.SHORT);
                return;
            }

            getRecordArray(setting.Rate, 'SELECT * FROM Record ORDER BY DateTime', [])
                .then(data => {
                    const fileName = setting['company-name-ZH'].slice(0, 2);

                    generateExcel(data)
                        .then(filePath => {
                            onSuccess(true); //成功動畫 start
                            sound.play(); // Play the sound with an onEnd callback

                            setTimeout(async () => {
                                onSuccess(false); //成功動畫 end

                                let savePath = CachesDirectoryPath + '/' + fileName + '.xlsx';
                                await RNFS.copyFile(filePath, savePath); //先複製度暫存目錄
                                await RNFS.unlink(filePath); //delete tmp file

                                if (type === 1) {
                                    //以電郵傳送
                                    Mailer.mail(
                                        {
                                            subject: setting['company-name-ZH'].slice(0, 2),
                                            recipients: [setting['Email-to']],
                                            body: `${setting['company-name-ZH']} 的Excel, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
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
                                        message: `${setting['company-name-ZH']} 的Excel, 已包在附件中。請查收。\n\n${setting['company-name-ZH']}\n${setting['Driver-name']}`,
                                        title: setting['company-name-ZH'].slice(0, 2),
                                        subject: setting['company-name-ZH'].slice(0, 2),
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
        [YearOpt.length, onSuccess, setting],
    );

    if (!visible) return null;
    return (
        <View>
            <View style={style.buttonGroup}>
                <Button icon={'email-fast-outline'} mode={'outlined'} onPress={() => export_(1)} style={style.button}>
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
function getRecordArray(rate, sql, args) {
    return new Promise(async (resolve, reject) => {
        try {
            await DB.readTransaction(async function (tr) {
                const [, rs] = await tr.executeSql(sql, args);

                if (rs.rows.length <= 0) {
                    reject('沒有任何資料');
                    return;
                }

                const recordArray = [];
                let lastDate = moment(rs.rows.item(0).DateTime);
                let tmp = [];

                for (let i = 0; i < rs.rows.length; i++) {
                    const row = rs.rows.item(i);

                    // 檢查是否要換月份
                    const currentDate = moment(row.DateTime);
                    if (!currentDate.isSame(lastDate, 'month') || i >= rs.rows.length - 1) {
                        recordArray.push({date: lastDate.format('yyyy-M'), record: tmp});
                        tmp = [];
                    }
                    lastDate = currentDate;

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
                        {v: row.Remark || '', t: 's'},
                    ]);
                }

                resolve(recordArray);
            });
        } catch (e) {
            console.error('傳輸錯誤: ' + e.message);
            ToastAndroid.show('傳輸錯誤: ' + e.message, ToastAndroid.SHORT);
            reject(e);
            return;
        }

        console.log('已取得資料');
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
            if (i === 7)
                return {
                    v: '',
                    t: 's',
                    s: {border: {right: {style: 'thin', color: {rgb: '000000'}}}},
                };
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
function generateExcel(recordArray) {
    return new Promise((resolve, reject) => {
        try {
            const wb = XLSX.utils.book_new();

            // 填充數據
            recordArray.forEach(item => {
                const record = item.record;
                record.unshift(...excelHeard);
                const ws = XLSX.utils.aoa_to_sheet(record);

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
                XLSX.utils.book_append_sheet(wb, ws, item.date);
            });

            // 產生檔案
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
