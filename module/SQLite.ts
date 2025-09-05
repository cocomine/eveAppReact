import SQLite from 'react-native-sqlite-storage';
import {ToastAndroid} from 'react-native';
import RNRestart from 'react-native-restart';
import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

SQLite.enablePromise(true);

/* 連接sql */
let DB: SQLite.SQLiteDatabase;

//連接 DB
async function openDB() {
    let dbname = await AsyncStorage.getItem('openDB');
    //不存在
    if (dbname === null) {
        await AsyncStorage.setItem('openDB', 'eveApp.db');
        dbname = 'eveApp.db';
    }
    console.log('Loading database: ' + dbname);

    if (DB != null) await closeDB();
    DB = await SQLite.openDatabase({name: dbname, location: 'default'});
    await checkUpdate();
}

//close DB
async function closeDB() {
    await DB.close();
}

//重啟app
const restartApp = () => {
    ToastAndroid.show('資料庫更新完成, 正在重新啟動', ToastAndroid.SHORT);
    RNRestart.Restart();
};

//檢查更新
const checkUpdate = async () => {
    try {
        await DB.readTransaction(async tr => {
            const [, rs] = await tr.executeSql("SELECT value FROM Setting WHERE Target = 'database_version'");

            switch (rs.rows.item(0).value) {
                case '1.0':
                    await doUpdate.To_1_2();
                    break;
                case '1.2':
                    await doUpdate.To_1_3();
                    break;
                case '1.3':
                    await doUpdate.To_1_3_1();
                    break;
                case '1.3.1':
                    await doUpdate.To_1_4();
                    break;
                case '1.4':
                    await doUpdate.To_1_4_1();
                    break;
                case '1.4.1':
                    await doUpdate.To_1_5();
                    break;
                case '1.5':
                    await doUpdate.To_1_5_1();
                    break;
                case '1.5.1':
                    await doUpdate.To_1_5_5();
                    break;
                case '1.5.5':
                    await doUpdate.To_1_5_6();
                    break;
                case '1.5.6':
                    await doUpdate.To_1_5_7();
                    break;
                default:
                    console.log('DatabaseVer_Helper:', '已是最新');
                    break;
            }
        });
    } catch (e: any) {
        console.log('DatabaseVer_Helper:', '檢查資料庫發現錯誤');
        console.error(e);
        await startUp(); //初始化資料庫
    }
};

//資料庫更新動作
const doUpdate = {
    To_1_2: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(
                    tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Decimal_places', '2')", []),
                );
                sql_promise.push(tr.executeSql("DELETE FROM Setting WHERE Target = 'google-access-token'", []));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.2' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.2失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.2');
        restartApp();
    },
    To_1_3: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(
                    tr.executeSql(
                        'CREATE TABLE Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) NOT NULL ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))',
                    ),
                );
                sql_promise.push(tr.executeSql('CREATE INDEX Note_DateTime ON Note(`DateTime`)'));
                sql_promise.push(tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top IS TRUE'));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.3' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.3失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.3');
        restartApp();
    },
    To_1_3_1: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(
                    tr.executeSql(
                        'CREATE TABLE new_Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) NOT NULL ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))',
                    ),
                );
                sql_promise.push(tr.executeSql('DROP TABLE Note'));
                sql_promise.push(tr.executeSql('DROP VIEW Top_Note'));
                sql_promise.push(tr.executeSql('ALTER TABLE new_Note RENAME TO Note'));
                sql_promise.push(tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top IS TRUE'));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.3.1' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.3.1失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.3.1');
        restartApp();
    },
    To_1_4: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(
                    tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Email-to', 'mail@example.com')", []),
                );
                sql_promise.push(tr.executeSql('ALTER TABLE Record ADD COLUMN Remake VARCHAR(50) DEFAULT NULL'));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.4' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.4失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.4');
        restartApp();
    },
    To_1_4_1: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(tr.executeSql('ALTER TABLE Record RENAME COLUMN Remake TO Remark'));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.4.1' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.4.1失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.4');
        restartApp();
    },
    To_1_5: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('AutoBackup', 'Off')", []));
                sql_promise.push(
                    tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('AutoBackup_cycle', 'Day')", []),
                );
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.5' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.5失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.5');
        restartApp();
    },
    To_1_5_1: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(tr.executeSql("DELETE FROM Setting WHERE Target = 'Decimal_places'", []));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.5.1' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.5.1失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.5.1');
        restartApp();
    },
    To_1_5_5: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(
                    tr.executeSql(
                        'create table Note_dg_tmp(ID INTEGER not null primary key, `DateTime` DATETIME not null, Top BOOLEAN default FALSE not null, Color VARCHAR(9), Title VARCHAR(20), Contact VARCHAR(200))',
                        [],
                    ),
                );
                sql_promise.push(
                    tr.executeSql(
                        'insert into Note_dg_tmp(ID, `DateTime`, Top, Color, Title, Contact) select ID, `DateTime`, Top, Color, Title, Contact from Note',
                        [],
                    ),
                );
                sql_promise.push(tr.executeSql('DROP VIEW Top_Note', []));
                sql_promise.push(tr.executeSql('drop table Note', []));
                sql_promise.push(tr.executeSql('alter table Note_dg_tmp rename to Note', []));
                sql_promise.push(tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top = 1', []));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.5.5' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.5.5失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.5.5');
        restartApp();
    },
    To_1_5_6: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(tr.executeSql("ALTER TABLE Record ADD COLUMN Images TEXT NOT NULL DEFAULT '[]'", []));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.5.6' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.5.6失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.5.6');
        restartApp();
    },
    To_1_5_7: async function () {
        try {
            await DB.transaction(async tr => {
                const sql_promise = [];
                sql_promise.push(tr.executeSql('ALTER TABLE Record ADD COLUMN `Rate` DOUBLE DEFAULT NULL', []));
                sql_promise.push(
                    tr.executeSql("UPDATE Setting SET value = '1.5.7' WHERE Target = 'database_version'", []),
                );

                await Promise.all(sql_promise);
            });
        } catch (e: any) {
            console.error('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            ToastAndroid.show('資料庫更新失敗', ToastAndroid.SHORT);
            throw new Error('資料庫更新1.5.7失敗', {cause: e});
        }

        console.log('DatabaseVer_Helper:', '資料庫已更新至1.5.7');
        restartApp();
    },
};

/**
 * 初始化資料庫
 **/
const startUp = async () => {
    try {
        await DB.transaction(async tr => {
            const sql_promise = [];

            //創建紀錄table
            sql_promise.push(
                tr.executeSql(
                    "CREATE TABLE IF NOT EXISTS Record ( `RecordID` INTEGER NOT NULL , `DateTime` DATETIME NOT NULL, `OrderNum` CHAR(9) NOT NULL , `Type` CHAR(2) NOT NULL , `CargoNum` CHAR(11) NOT NULL , `Local` VARCHAR(50) NOT NULL , `RMB` DOUBLE NOT NULL DEFAULT '0' , /*`Rate` DOUBLE DEFAULT NULL,*/ `HKD` DOUBLE NOT NULL DEFAULT '0' , `Add` DOUBLE NOT NULL DEFAULT '0' , `Shipping` DOUBLE NOT NULL DEFAULT '0' , `Remark` VARCHAR(50) DEFAULT NULL, `Images` TEXT NOT NULL DEFAULT '[]', PRIMARY KEY (`RecordID`))",
                ),
            );
            sql_promise.push(tr.executeSql('CREATE INDEX `DateTime` ON Record (`DateTime`)'));

            //創建備忘錄table
            sql_promise.push(
                tr.executeSql(
                    'CREATE TABLE Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))',
                ),
            );
            sql_promise.push(tr.executeSql('CREATE INDEX Note_DateTime ON Note(`DateTime`)'));
            sql_promise.push(tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top = 1'));

            //創建設定table
            sql_promise.push(
                tr.executeSql('CREATE TABLE Setting (Target VARCHAR(50) PRIMARY KEY, value VARCHAR(100))'),
            );

            //資料庫填充
            sql_promise.push(tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Rate', '0.836')", []));
            sql_promise.push(
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('company-name-ZH', '公司名稱')", []),
            );
            sql_promise.push(
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('company-name-EN', 'Company Name')", []),
            );
            sql_promise.push(tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Driver-name', '陳大明')", []));
            sql_promise.push(
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Driver-license', 'RT XXXX')", []),
            );
            sql_promise.push(
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('database_version', '1.5.7')", []),
            );
            sql_promise.push(
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Email-to', 'mail@example.com')", []),
            );
            sql_promise.push(tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('AutoBackup', 'Off')", []));
            sql_promise.push(
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('AutoBackup_cycle', 'Day')", []),
            );

            await Promise.all(sql_promise);
        });
    } catch (e: any) {
        console.error('傳輸錯誤: ', e.message);
        ToastAndroid.show('資料庫初始化失敗', ToastAndroid.SHORT);
        throw new Error('傳輸錯誤', {cause: e});
    }

    console.log('已初始化資料庫');
    ToastAndroid.show('已初始化資料庫', ToastAndroid.SHORT);
    restartApp();
};
console.log('DatabaseVer_Helper loaded!');

//'設定'類型
interface SettingType {
    Rate: string;
    'company-name-ZH': string;
    'company-name-EN': string;
    'Driver-name': string;
    'Driver-license': string;
    database_version: string;
    'Email-to': string;
    AutoBackup: string;
    AutoBackup_cycle: string;
    Decimal_places: string; // 可選屬性，可能在某些版本中
}

let settingRefresh = true; //設定刷新錨定參數

/**
 * 設定Hook
 */
function useSetting() {
    const [setting, setSetting] = useState<Partial<SettingType>>({});
    const [refresh, setRefresh] = useState(settingRefresh);

    const forceRefresh = useCallback(() => setRefresh(prev => !prev), []);

    useEffect(() => {
        async function fetchSetting() {
            try {
                await DB.readTransaction(async tr => {
                    const [, rs] = await tr.executeSql('SELECT * FROM Setting', []);

                    //將結果轉換為物件
                    let setting_tmp: Partial<SettingType> = {};
                    for (let i = 0; i < rs.rows.length; i++) {
                        const key = rs.rows.item(i).Target as keyof SettingType;
                        setting_tmp[key] = rs.rows.item(i).value;
                    }
                    setSetting(setting_tmp);
                    console.log('獲取設定成功');
                    console.debug(setting_tmp);
                });
            } catch (e: any) {
                console.error('傳輸錯誤: ' + e.message);
                ToastAndroid.show('獲取設定失敗', ToastAndroid.SHORT);
                throw new Error('傳輸錯誤', {cause: e});
            }
        }

        console.log('刷新設定');
        fetchSetting().then();
    }, [refresh]);

    return [setting, forceRefresh];
}

/**
 * 刷新設定
 */
function updateSetting() {
    settingRefresh = !settingRefresh;
}

export {DB, useSetting, openDB, closeDB, updateSetting};
