import SQLite, {ResultSet} from 'react-native-sqlite-storage';
import {ToastAndroid} from 'react-native';
import RNRestart from 'react-native-restart';
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    if (DB != null) closeDB();
    DB = SQLite.openDatabase({name: dbname, location: 'default'}, () => {
        checkUpdate();
        return;
    });
}

//close DB
function closeDB() {
    DB.close();
}

const restartApp = () => {
    ToastAndroid.show('資料庫更新完成, 正在重新啟動', ToastAndroid.SHORT);
    RNRestart.Restart();
};
const checkUpdate = () => {
    DB.transaction(function (tr) {
        tr.executeSql(
            "SELECT value FROM Setting WHERE Target = 'database_version'",
            [],
            (tx, rs) => {
                switch (rs.rows.item(0).value) {
                    case '1.0':
                        doUpdate.To_1_2();
                        break;
                    case '1.2':
                        doUpdate.To_1_3();
                        break;
                    case '1.3':
                        doUpdate.To_1_3_1();
                        break;
                    case '1.3.1':
                        doUpdate.To_1_4();
                        break;
                    case '1.4':
                        doUpdate.To_1_4_1();
                        break;
                    case '1.4.1':
                        doUpdate.To_1_5();
                        break;
                    case '1.5':
                        doUpdate.To_1_5_1();
                        break;
                    case '1.5.1':
                        doUpdate.To_1_5_5();
                        break;
                    case '1.5.5':
                        doUpdate.To_1_5_6();
                        break;
                    /*case '1.5.6':
                        doUpdate.To_1_5_7();
                        break;*/
                    default:
                        SQLite.enablePromise(true); // 啟用 promise 以便使用 async/await
                        console.log('DatabaseVer_Helper:', '已是最新');
                        break;
                }
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '檢查資料庫發現錯誤');
                console.error(e);
                startUp(); //初始化資料庫
            },
        );
    });
};
const doUpdate = {
    To_1_2: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Decimal_places', '2')", []);
                tr.executeSql("DELETE FROM Setting WHERE Target = 'google-access-token'", []);
                tr.executeSql("UPDATE Setting SET value = '1.2' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.2');
                restartApp();
            },
        );
    },
    To_1_3: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql(
                    'CREATE TABLE Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) NOT NULL ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))',
                );
                tr.executeSql('CREATE INDEX Note_DateTime ON Note(`DateTime`)');
                tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top IS TRUE');
                tr.executeSql("UPDATE Setting SET value = '1.3' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.3');
                restartApp();
            },
        );
    },
    To_1_3_1: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql(
                    'CREATE TABLE new_Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) NOT NULL ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))',
                );
                tr.executeSql('DROP TABLE Note');
                tr.executeSql('DROP VIEW Top_Note');
                tr.executeSql('ALTER TABLE new_Note RENAME TO Note');
                tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top IS TRUE');
                tr.executeSql("UPDATE Setting SET value = '1.3.1' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.3.1');
                restartApp();
            },
        );
    },
    To_1_4: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Email-to', 'mail@example.com')", []);
                tr.executeSql('ALTER TABLE Record ADD COLUMN Remake VARCHAR(50) DEFAULT NULL');
                tr.executeSql("UPDATE Setting SET value = '1.4' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.4');
                restartApp();
            },
        );
    },
    To_1_4_1: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql('ALTER TABLE Record RENAME COLUMN Remake TO Remark');
                tr.executeSql("UPDATE Setting SET value = '1.4.1' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.4');
                restartApp();
            },
        );
    },
    To_1_5: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('AutoBackup', 'Off')", []); //放入sql
                tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('AutoBackup_cycle', 'Day')", []); //放入sql
                tr.executeSql("UPDATE Setting SET value = '1.5' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.5');
                restartApp();
            },
        );
    },
    To_1_5_1: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql("DELETE FROM Setting WHERE Target = 'Decimal_places'", []);
                tr.executeSql("UPDATE Setting SET value = '1.5.1' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.5.1');
                restartApp();
            },
        );
    },
    To_1_5_5: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql(
                    'create table Note_dg_tmp(ID INTEGER not null primary key, `DateTime` DATETIME not null, Top BOOLEAN default FALSE not null, Color VARCHAR(9), Title VARCHAR(20), Contact VARCHAR(200))',
                    [],
                );
                tr.executeSql(
                    'insert into Note_dg_tmp(ID, `DateTime`, Top, Color, Title, Contact) select ID, `DateTime`, Top, Color, Title, Contact from Note',
                    [],
                );
                tr.executeSql('DROP VIEW Top_Note', []);
                tr.executeSql('drop table Note', []);
                tr.executeSql('alter table Note_dg_tmp rename to Note', []);
                tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top = 1', []);
                tr.executeSql("UPDATE Setting SET value = '1.5.5' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.5.5');
                restartApp();
            },
        );
    },
    To_1_5_6: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql("ALTER TABLE Record ADD COLUMN Images TEXT NOT NULL DEFAULT '[]'", []);
                tr.executeSql("UPDATE Setting SET value = '1.5.6' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.5.6');
                restartApp();
            },
        );
    },
    To_1_5_7: function () {
        DB.transaction(
            function (tr) {
                tr.executeSql('ALTER TABLE Record ADD COLUMN `Rate` DOUBLE DEFAULT NULL', []);
                tr.executeSql("UPDATE Setting SET value = '1.5.7' WHERE Target = 'database_version'", []);
            },
            function (e) {
                console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
            },
            function () {
                console.log('DatabaseVer_Helper:', '資料庫已更新至1.5.7');
                restartApp();
            },
        );
    },
};
const startUp = () => {
    /* 初始化資料庫*/
    DB.transaction(
        function (tr) {
            //創建紀錄table
            tr.executeSql(
                "CREATE TABLE Record ( `RecordID` INTEGER NOT NULL , `DateTime` DATETIME NOT NULL, `OrderNum` CHAR(9) NOT NULL , `Type` CHAR(2) NOT NULL , `CargoNum` CHAR(11) NOT NULL , `Local` VARCHAR(50) NOT NULL , `RMB` DOUBLE NOT NULL DEFAULT '0' , `Rate` DOUBLE DEFAULT NULL, `HKD` DOUBLE NOT NULL DEFAULT '0' , `Add` DOUBLE NOT NULL DEFAULT '0' , `Shipping` DOUBLE NOT NULL DEFAULT '0' , `Remark` VARCHAR(50) DEFAULT NULL, `Images` TEXT NOT NULL DEFAULT '[]', PRIMARY KEY (`RecordID`))",
            );
            tr.executeSql('CREATE INDEX `DateTime` ON Record (`DateTime`)');
            //創建備忘錄table
            tr.executeSql(
                'CREATE TABLE Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))',
            );
            tr.executeSql('CREATE INDEX Note_DateTime ON Note(`DateTime`)');
            tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top = 1');
            //創建設定table
            tr.executeSql('CREATE TABLE Setting (Target VARCHAR(50) PRIMARY KEY, value VARCHAR(100))');
            //資料庫填充
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Rate', '0.836')", []); //放入sql
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('company-name-ZH', '公司名稱')", []); //放入sql
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('company-name-EN', 'Company Name')", []); //放入sql
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Driver-name', '陳大明')", []); //放入sql
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Driver-license', 'RT XXXX')", []); //放入sql
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('database_version', '1.5.7')", []); //放入sql
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('Email-to', 'mail@example.com')", []);
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('AutoBackup', 'Off')", []); //放入sql
            tr.executeSql("INSERT INTO Setting (Target, value) VALUES ('AutoBackup_cycle', 'Day')", []); //放入sql
        },
        function (error) {
            console.log('傳輸錯誤: ' + error.message);
        },
        function () {
            console.log('已初始化資料庫');
            restartApp();
        },
    );
};
console.log('DatabaseVer_Helper loaded!');

let settingRefresh = true; //設定刷新錨定參數
/**
 * 設定Hook
 * @returns {unknown[]}
 */
function useSetting() {
    const [setting, setSetting] = useState<string[] | null>(null);

    useEffect(() => {
        async function fetchSetting() {
            await DB.transaction(async function (tr) {
                const response = await tr.executeSql('SELECT * FROM Setting', []);

                if (response) {
                    const rs: ResultSet = response[1]; //獲取結果集
                    let Setting: string[] = [];
                    for (let i = 0; i < rs.rows.length; i++) {
                        Setting[rs.rows.item(i).Target] = rs.rows.item(i).value;
                    }
                    setSetting(Setting);
                    console.log('獲取設定成功'); //debug
                }
            }).catch(error => {
                console.log('傳輸錯誤: ' + error.message); //debug
            });
        }

        fetchSetting();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingRefresh]);

    return [setting];
}

/**
 * 刷新設定
 */
function updateSetting() {
    settingRefresh = !settingRefresh;
}

export {DB, useSetting, openDB, closeDB, updateSetting};
