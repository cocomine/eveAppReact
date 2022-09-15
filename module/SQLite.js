import SQLite from 'react-native-sqlite-storage';
import {ToastAndroid} from 'react-native';
import RNRestart from 'react-native-restart';
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* 連接sql */
let DB = null;

//連接 DB
async function openDB(){
    let dbname = await AsyncStorage.getItem('openDB') || 'eveApp.db';
    console.log('Loading database: ' + dbname);

    if(DB != null){
        closeDB();
        DB = null;
    }
    DB = SQLite.openDatabase({name: dbname, location: 'default'});
    checkUpdate();
}

function closeDB(){DB.close();} //close DB

const restartApp = () => {
    ToastAndroid.show('資料庫更新完成, 正在重新啟動', ToastAndroid.LONG);
    RNRestart.Restart();
};
const checkUpdate = () => {
    DB.transaction(function(tr){
        tr.executeSql('SELECT value FROM Setting WHERE Target = \'database_version\'', [], (tx, rs) => {
            switch(rs.rows.item(0).value){
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
                default:
                    console.log('DatabaseVer_Helper:', '已是最新');
                    break;
            }
        }, function(e){
            console.log('DatabaseVer_Helper:', '檢查資料庫發現錯誤', e.message);
            startUp();//初始化資料庫
        }, function(){
            console.log('DatabaseVer_Helper:', '檢查資料庫完成');
        });
    });
};
const doUpdate = {
    To_1_2: function(){
        DB.transaction(function(tr){
            tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'Decimal_places\', \'2\')', []);
            tr.executeSql('DELETE FROM Setting WHERE Target = \'google-access-token\'', []);
            tr.executeSql('UPDATE Setting SET value = \'1.2\' WHERE Target = \'database_version\'', []);
        }, function(e){
            console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
        }, function(){
            console.log('DatabaseVer_Helper:', '資料庫已更新至1.2');
            restartApp();
        });
    },
    To_1_3: function(){
        DB.transaction(function(tr){
            tr.executeSql(
                'CREATE TABLE Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) NOT NULL ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))');
            tr.executeSql('CREATE INDEX Note_DateTime ON Note(`DateTime`)');
            tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top IS TRUE');
            tr.executeSql('UPDATE Setting SET value = \'1.3\' WHERE Target = \'database_version\'', []);
        }, function(e){
            console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
        }, function(){
            console.log('DatabaseVer_Helper:', '資料庫已更新至1.3');
            restartApp();
        });
    },
    To_1_3_1: function(){
        DB.transaction(function(tr){
            tr.executeSql(
                'CREATE TABLE new_Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) NOT NULL ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))');
            tr.executeSql('DROP TABLE Note');
            tr.executeSql('DROP VIEW Top_Note');
            tr.executeSql('ALTER TABLE new_Note RENAME TO Note');
            tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top IS TRUE');
            tr.executeSql('UPDATE Setting SET value = \'1.3.1\' WHERE Target = \'database_version\'', []);
        }, function(e){
            console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
        }, function(){
            console.log('DatabaseVer_Helper:', '資料庫已更新至1.3.1');
            restartApp();
        });
    },
    To_1_4: function(){
        DB.transaction(function(tr){
            tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'Email-to\', \'mail@example.com\')', []);
            tr.executeSql('ALTER TABLE Record ADD COLUMN Remake VARCHAR(50) DEFAULT NULL');
            tr.executeSql('UPDATE Setting SET value = \'1.4\' WHERE Target = \'database_version\'', []);
        }, function(e){
            console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
        }, function(){
            console.log('DatabaseVer_Helper:', '資料庫已更新至1.4');
            restartApp();
        });
    },
    To_1_4_1: function(){
        DB.transaction(function(tr){
            tr.executeSql('ALTER TABLE Record RENAME COLUMN Remake TO Remark');
            tr.executeSql('UPDATE Setting SET value = \'1.4.1\' WHERE Target = \'database_version\'', []);
        }, function(e){
            console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
        }, function(){
            console.log('DatabaseVer_Helper:', '資料庫已更新至1.4');
            restartApp();
        });
    },
    To_1_5: function(){
        DB.transaction(function(tr){
            tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'AutoBackup\', \'Off\')', []); //放入sql
            tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'AutoBackup_cycle\', \'Day\')', []); //放入sql
            tr.executeSql('UPDATE Setting SET value = \'1.5\' WHERE Target = \'database_version\'', []);
        }, function(e){
            console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
        }, function(){
            console.log('DatabaseVer_Helper:', '資料庫已更新至1.5');
            restartApp();
        });
    },
    To_1_5_1: function(){
        DB.transaction(function(tr){
            tr.executeSql('DELETE FROM Setting WHERE Target = \'Decimal_places\'', []);
            tr.executeSql('UPDATE Setting SET value = \'1.5.1\' WHERE Target = \'database_version\'', []);
        }, function(e){
            console.log('DatabaseVer_Helper:', '資料庫更新失敗', e.message);
        }, function(){
            console.log('DatabaseVer_Helper:', '資料庫已更新至1.5');
            restartApp();
        });
    }
};
const startUp = () => {
    /* 初始化資料庫*/
    DB.transaction(function(tr){
        //創建紀錄table
        tr.executeSql(
            'CREATE TABLE Record ( `RecordID` INTEGER NOT NULL , `DateTime` DATETIME NOT NULL, `OrderNum` CHAR(9) NOT NULL , `Type` CHAR(2) NOT NULL , `CargoNum` CHAR(11) NOT NULL , `Local` VARCHAR(50) NOT NULL , `RMB` DOUBLE NOT NULL DEFAULT \'0\' , `HKD` DOUBLE NOT NULL DEFAULT \'0\' , `Add` DOUBLE NOT NULL DEFAULT \'0\' , `Shipping` DOUBLE NOT NULL DEFAULT \'0\' , `Remark` VARCHAR(50) DEFAULT NULL, PRIMARY KEY (`RecordID`))');
        tr.executeSql('CREATE INDEX `DateTime` ON Record (`DateTime`)');
        //創建備忘錄table
        tr.executeSql(
            'CREATE TABLE Note ( `ID` INTEGER NOT NULL, `DateTime` DATETIME NOT NULL , `Top` BOOLEAN NOT NULL DEFAULT FALSE, `Color` VARCHAR(9) NOT NULL ,`Title` VARCHAR(20) NULL , `Contact` VARCHAR(200) NULL , PRIMARY KEY (`ID`))');
        tr.executeSql('CREATE INDEX Note_DateTime ON Note(`DateTime`)');
        tr.executeSql('CREATE VIEW Top_Note AS SELECT * FROM Note WHERE Top IS TRUE');
        //創建設定table
        tr.executeSql('CREATE TABLE Setting (Target VARCHAR(50) PRIMARY KEY, value VARCHAR(100))');
        //資料庫填充
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'Rate\', \'0.836\')', []); //放入sql
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'company-name-ZH\', \'公司名稱\')', []); //放入sql
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'company-name-EN\', \'Company Name\')', []); //放入sql
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'Driver-name\', \'陳大明\')', []); //放入sql
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'Driver-license\', \'RT XXXX\')', []); //放入sql
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'database_version\', \'1.5\')', []); //放入sql
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'Email-to\', \'mail@example.com\')', []);
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'AutoBackup\', \'Off\')', []); //放入sql
        tr.executeSql('INSERT INTO Setting (Target, value) VALUES (\'AutoBackup_cycle\', \'day\')', []); //放入sql

    }, function(error){
        console.log('傳輸錯誤: ' + error.message);
    }, function(){
        console.log('已初始化資料庫');
        restartApp();
    });
};
console.log('DatabaseVer_Helper loaded!');

/**
 * 設定Hook
 * @returns {unknown[]}
 */
function useSetting(){
    const [setting, setSetting] = useState(null);

    useEffect(() => {
        DB.transaction(function(tr){
            tr.executeSql('SELECT * FROM Setting', [], function(tx, rs){
                let Setting = [];
                for(let i = 0 ; i < rs.rows.length ; i++){
                    Setting[rs.rows.item(i).Target] = rs.rows.item(i).value;
                }
                setSetting(Setting);
            }, function(error){
                console.log('獲取失敗: ' + error.message); //debug
            });
        }, function(error){
            console.log('傳輸錯誤: ' + error.message); //debug
        });
    }, []);

    return [setting];
}

export {DB, useSetting, openDB, closeDB};