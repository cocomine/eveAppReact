import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, Image, Linking, StyleSheet, ToastAndroid, useColorScheme, View} from 'react-native';
import {Color} from '../module/Color';
import {Appbar, Button, Dialog, Headline, Portal, Subheading, Switch, Text, Title, useTheme} from 'react-native-paper';
import {RadioButton, RadioGroup} from '../module/RadioButton';
import Lottie from 'lottie-react-native';
import {GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes} from '@react-native-google-signin/google-signin';
import {GDrive, MimeTypes} from '@robinbobin/react-native-google-drive-api-wrapper';
import RNFS, {CachesDirectoryPath} from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import {closeDB, DB, openDB} from '../module/SQLite';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {FoldIn, FoldOut} from '../module/Fold';
import {Ripple} from '../module/Ripple';
import SVGLostCargo from '../module/SVGLostCargo';
import {base64ToBytes, bytesToBase64} from 'byte-base64';
import RNRestart from 'react-native-restart';
import notifee from '@notifee/react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/* google設定 */
GoogleSignin.configure({scopes: ['https://www.googleapis.com/auth/drive.file', 'profile']});
GoogleSignin.signInSilently()
    .then(response => {
        if (isSuccessResponse(response)) {
            console.log('Google API SignIn Silently Success', response.data.user.email);
        } else {
            console.log('Google API SignIn Silently Failed');
        }
    })
    .catch(e => console.log('Google API Error: ' + e.message));
const GDRIVE = new GDrive();

const Backup = ({navigation}) => {
    const {colors} = useTheme();
    const is_dark_mode = useColorScheme() === 'dark'; //是否黑暗模式
    const bg_color = is_dark_mode ? Color.darkBlock : Color.white;

    const [is_login, setIsLogin] = useState(false); //登入狀態
    const [user_info, setUserInfo] = useState({user: null}); //用戶資料
    const [new_backup_date, setNewBackupDate] = useState(null); //最新備份日期
    const [backing_up, setBackingUp] = useState(false); //備份中彈出視窗
    const [restoring, setRestoring] = useState(false); //備份中彈出視窗
    const [file_list, setFileList] = useState(null); //恢復中彈出視窗
    const [auto_backup_enable, setAutoBackupEnable] = useState(false); //自動備份狀態
    const [auto_backup_cycle, setAutoBackupCycle] = useState('Week'); //自動備份狀態
    const folder_id = useRef(null); //資料夾id
    const insets = useSafeAreaInsets(); //安全區域

    /* 初始化 */
    useEffect(() => {
        const startup = async () => {
            if (GoogleSignin.hasPreviousSignIn()) {
                const userinfo = GoogleSignin.getCurrentUser();
                setUserInfo({...userinfo});
                setIsLogin(true);
                GDRIVE.accessToken = (await GoogleSignin.getTokens()).accessToken;

                const [folder, backup_date] = await getBackupFolderAndLatestDate();
                folder_id.current = folder;
                setNewBackupDate(backup_date ? backup_date : '');
            } else {
                ToastAndroid.show('連接已斷開, 請重新連接', ToastAndroid.SHORT);
            }
        };
        startup()
            .then()
            .catch(() => ToastAndroid.show('發生錯誤請, 檢查網絡狀態', ToastAndroid.SHORT));

        const extracted = async () => {
            try {
                await DB.readTransaction(async function (tr) {
                    const [, rs] = await tr.executeSql(
                        "SELECT value FROM Setting WHERE Target IN('AutoBackup', 'AutoBackup_cycle')",
                        [],
                    );

                    setAutoBackupEnable(rs.rows.item(0).value === 'On');
                    setAutoBackupCycle(rs.rows.item(1).value);
                    //console.log(rs.rows.item(0).value, rs.rows.item(1).value)
                });
            } catch (e) {
                console.error('自動備份獲取資料失敗', e.message);
                ToastAndroid.show('自動備份獲取資料失敗', ToastAndroid.SHORT);
            }
        };

        extracted().then();
    }, []);

    /* 斷開連接 */
    const unlink = useCallback(async () => {
        await GoogleSignin.signOut();
        setUserInfo({user: null});
        setIsLogin(false);
        setNewBackupDate(null);
        folder_id.current = null;
        ToastAndroid.show('連接已斷開', ToastAndroid.SHORT);
    }, []);

    /* 連接 */
    const link = useCallback(async () => {
        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

        try {
            const response = await GoogleSignin.signIn();
            if (isSuccessResponse(response)) {
                //login成功
                setUserInfo({...response.data});
                setIsLogin(true);
                GDRIVE.accessToken = (await GoogleSignin.getTokens()).accessToken;

                const [folder, backup_date] = await getBackupFolderAndLatestDate();
                folder_id.current = folder;
                setNewBackupDate(backup_date);
            } else {
                //cancel login
                ToastAndroid.show('已取消連結', ToastAndroid.SHORT);
            }
        } catch (error) {
            console.error(error);
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.IN_PROGRESS:
                        ToastAndroid.show('連結仍在進行中', ToastAndroid.SHORT);
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        ToastAndroid.show('Google Play service不可用', ToastAndroid.SHORT);
                        break;
                    default:
                        ToastAndroid.show('未知其他錯誤: ' + error.code, ToastAndroid.SHORT);
                }
            }
            await unlink();
        }
    }, [unlink]);

    /* 備份 */
    const backup = useCallback(async () => {
        setBackingUp(true);
        await closeDB();

        try {
            await doBackup(folder_id.current);
        } catch (e) {
            ToastAndroid.show('備份失敗', ToastAndroid.SHORT);
            console.log('備份失敗: ' + e.message);
            console.error(e);
        } finally {
            const [folder, backup_date] = await getBackupFolderAndLatestDate();
            folder_id.current = folder;
            setNewBackupDate(backup_date);

            await openDB();
            setBackingUp(false);
        }
    }, []);

    /* 恢復列表 */
    const restoreList = useCallback(async () => {
        const backup_list = await getBackupList(folder_id.current);
        setFileList(backup_list);
    }, []);

    /* 關閉恢復列表 */
    const closeRestoreList = useCallback(() => {
        setFileList(null);
    }, []);

    /* 恢復 */
    const restore = useCallback(async file_id => {
        setRestoring(true);
        setFileList(null);
        await closeDB();

        try {
            await doRestore(file_id);
            ToastAndroid.show('恢復成功', ToastAndroid.SHORT);
            RNRestart.Restart();
        } catch (e) {
            ToastAndroid.show('恢復失敗', ToastAndroid.SHORT);
        } finally {
            await openDB();
            setRestoring(false);
        }
    }, []);

    /* 處理退出頁面 阻止退出 */
    useEffect(() => {
        //處理
        return navigation.addListener('beforeRemove', e => {
            //清除活動監聽器
            if (backing_up || restoring) {
                e.preventDefault();
            } //阻止退出
        });
    }, [navigation, backing_up, restoring]);

    /* 開關自動備份 */
    const switchAutoBackup = useCallback(async status => {
        setAutoBackupEnable(status);

        const checked = status ? 'On' : 'Off';
        try {
            await DB.transaction(async function (tr) {
                await tr.executeSql("UPDATE Setting SET value = ? WHERE Target = 'AutoBackup'", [checked]);
            });
        } catch (e) {
            console.error('開關自動備份更新失敗', e.message);
            ToastAndroid.show('開關自動備份更新失敗', ToastAndroid.SHORT);
            return;
        }

        console.log('開關自動備份更新成功');
    }, []);

    /* 設置自動備份週期 */
    const changeAutoBackupCycle = useCallback(async value => {
        try {
            await DB.transaction(async function (tr) {
                await tr.executeSql("UPDATE Setting SET value = ? WHERE Target = 'AutoBackup_cycle'", [value]);
            });
        } catch (e) {
            console.error('自動備份週期更新失敗', e.message);
            ToastAndroid.show('自動備份週期更新失敗', ToastAndroid.SHORT);
            return;
        }

        console.log('自動備份週期更新成功');
    }, []);

    return (
        <View style={{flex: 1}}>
            {/*<React.StrictMode>*/}
            <Appbar style={{backgroundColor: Color.primaryColor, height: 'auto'}} safeAreaInsets={{top: insets.top}}>
                <Appbar.BackAction onPress={navigation.goBack} />
                <Appbar.Content title={'備份'} color={Color.white} />
                <Appbar.Action icon={'link-variant-off'} onPress={unlink} disabled={!is_login} />
            </Appbar>
            <View style={{flex: 1, justifyContent: 'space-between'}}>
                <View>
                    <View style={[STYLE.backup, {backgroundColor: bg_color}]}>
                        <View style={STYLE.logo}>
                            <Headline>Google雲端備份</Headline>
                            <Image
                                source={require('../resource/google-drive-logo2.png')}
                                style={{
                                    width: 141.91,
                                    height: 38.67,
                                }}
                                resizeMode={'contain'}
                            />
                        </View>
                        <Text>你可以手動將資料備份至google雲端硬碟。你可以隨時從google雲端硬碟中恢復資料。</Text>
                        <View style={[STYLE.detail, {backgroundColor: colors.background}]}>
                            <View style={STYLE.row}>
                                <Text style={{flex: 1 / 3}}>最新備份:</Text>
                                <Text style={{flex: 1, color: Color.blue}} ellipsizeMode={'tail'} numberOfLines={1}>
                                    {new_backup_date}
                                </Text>
                            </View>
                            <View style={STYLE.row}>
                                <Text style={{flex: 1 / 3}}>URL:</Text>
                                <Text
                                    style={{
                                        flex: 1,
                                        textDecorationLine: 'underline',
                                        color: Color.green,
                                    }}
                                    ellipsizeMode={'tail'}
                                    numberOfLines={1}
                                    onPress={() => Linking.openURL('https://drive.google.com')}>
                                    https://drive.google.com
                                </Text>
                            </View>
                            <View style={STYLE.row}>
                                <Text style={{flex: 1 / 3}}>Email:</Text>
                                <Text style={{flex: 1}} ellipsizeMode={'tail'} numberOfLines={1}>
                                    {user_info.user ? user_info.user.email : null}
                                </Text>
                            </View>
                        </View>
                    </View>
                    {is_login ? (
                        <Animated.View
                            style={[STYLE.backup, {backgroundColor: bg_color}]}
                            entering={FoldIn}
                            exiting={FoldOut}>
                            <View style={STYLE.logo}>
                                <Title>自動備份:</Title>
                                <Switch
                                    value={auto_backup_enable}
                                    color={Color.primaryColor}
                                    onValueChange={switchAutoBackup}
                                />
                            </View>
                            <RadioGroup
                                containerStyle={{
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    paddingHorizontal: 20,
                                }}
                                onPress={changeAutoBackupCycle}>
                                <RadioButton
                                    value={'Day'}
                                    label={'每日'}
                                    color={Color.primaryColor}
                                    selected={auto_backup_cycle === 'Day'}
                                />
                                <RadioButton
                                    value={'Week'}
                                    label={'每週'}
                                    color={Color.primaryColor}
                                    selected={auto_backup_cycle === 'Week'}
                                />
                                <RadioButton
                                    value={'Month'}
                                    label={'每月'}
                                    color={Color.primaryColor}
                                    selected={auto_backup_cycle === 'Month'}
                                />
                            </RadioGroup>
                        </Animated.View>
                    ) : null}
                </View>
                <View style={[STYLE.button, {backgroundColor: bg_color, paddingBottom: insets.bottom + 10}]}>
                    <View style={{display: is_login ? 'none' : undefined}}>
                        <Button mode={'contained'} buttonColor={Color.green} icon={'link-variant'} onPress={link}>
                            連接
                        </Button>
                    </View>
                    <View style={[STYLE.row, {display: !is_login ? 'none' : undefined}]}>
                        <Button
                            mode={'outlined'}
                            style={{
                                flex: 1,
                                marginRight: 5,
                            }}
                            icon={'backup-restore'}
                            onPress={restoreList}
                            disabled={new_backup_date === null}>
                            恢復
                        </Button>
                        <Button
                            mode={'contained'}
                            style={{flex: 1}}
                            icon={'cloud-upload'}
                            onPress={backup}
                            disabled={new_backup_date === null}>
                            備份
                        </Button>
                    </View>
                </View>
            </View>
            <Portal>
                {backing_up ? (
                    <Animated.View
                        style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.74)'}}
                        entering={FadeIn}
                        exiting={FadeOut}>
                        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                            <Lottie
                                source={require('../resource/upload.json')}
                                autoPlay={true}
                                loop={true}
                                style={{
                                    width: 300,
                                    height: 300,
                                }}
                            />
                            <Title style={{color: Color.white, paddingTop: 40}}>備份中...</Title>
                        </View>
                    </Animated.View>
                ) : null}
                {restoring ? (
                    <Animated.View
                        style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.74)'}}
                        entering={FadeIn}
                        exiting={FadeOut}>
                        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                            <Lottie
                                source={require('../resource/download.json')}
                                autoPlay={true}
                                loop={true}
                                style={{
                                    width: 300,
                                    height: 300,
                                }}
                            />
                            <Title style={{color: Color.white, paddingTop: 40}}>恢復中...</Title>
                        </View>
                    </Animated.View>
                ) : null}
                <Dialog onDismiss={closeRestoreList} visible={file_list != null} style={{maxHeight: '90%', top: -15}}>
                    <Dialog.Title>恢復備份</Dialog.Title>
                    <Dialog.ScrollArea>
                        <FlatList
                            data={file_list ?? []}
                            renderItem={({item}) => <RestoreList data={item} onPress={() => restore(item.id)} />}
                            ItemSeparatorComponent={() => (
                                <View style={{borderColor: Color.darkColorLight, borderTopWidth: 0.5}} />
                            )}
                            ListEmptyComponent={
                                <View style={{justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                                    <SVGLostCargo height="90" width="250" />
                                    <Text>沒有資料... Σ(っ °Д °;)っ</Text>
                                </View>
                            }
                        />
                    </Dialog.ScrollArea>
                    <Dialog.Actions>
                        <Button onPress={closeRestoreList}>取消</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
            {/*</React.StrictMode>*/}
        </View>
    );
};

/* 恢復列表item */
const RestoreList = ({data, onPress}) => {
    return (
        <Ripple.Default onPress={onPress}>
            <View style={STYLE.list}>
                <Subheading>{data.name}</Subheading>
            </View>
        </Ripple.Default>
    );
};

/* 備份檔案列表 */
const getBackupList = async folder_id => {
    const files_list = await GDRIVE.files.list({
        q: `(parents = "${folder_id}") and (trashed = false)`,
        orderBy: 'createdTime desc',
    });

    const filtered_files_list = files_list.files.filter(
        item =>
            item.mimeType === 'application/x-sqlite3' &&
            item.name.match(
                /^(.+_)([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})-([0-9]{1,2}):([0-9]{2}):([0-9]{2})\.([0-9]{3})(\.db)$/g,
            ),
    );

    console.log('取得備份列表 共 ' + filtered_files_list.length + ' 個');
    return filtered_files_list;
};

/* 列出所有備份 */
const getBackupFolderAndLatestDate = async () => {
    const list = await GDRIVE.files.list({
        q: '(name = "eveApp") and (mimeType = "application/vnd.google-apps.folder") and (trashed = false)',
    });

    let folder_id = list.files[0] ? list.files[0].id : null;
    // 不存在創建文件夾
    if (folder_id === null) {
        const tmp = await GDRIVE.files
            .newMetadataOnlyUploader()
            .setRequestBody({
                name: 'eveApp',
                mimeType: MimeTypes.FOLDER,
                parent: ['root'],
                description: 'eveApp Database folder.',
            })
            .execute();
        folder_id = tmp.id;
    }

    // 設置最新日期
    const backup_list = await getBackupList(folder_id);
    let create_time = backup_list[0]
        ? backup_list[0].name.match(
              /([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})-([0-9]{1,2}):([0-9]{2}):([0-9]{2})\.([0-9]{3})/g,
          )
        : [''];

    return [folder_id, create_time];
};

/* 進行備份 */
const doBackup = async folder_id => {
    //讀取檔案
    const db_name = (await AsyncStorage.getItem('openDB')).split('.');
    await RNFS.copyFile(
        CachesDirectoryPath + '/../databases/' + db_name[0] + '.db',
        CachesDirectoryPath + '/backup.tmp.db',
    ); //copy to Caches folder
    const file = await RNFS.readFile(CachesDirectoryPath + '/backup.tmp.db', 'base64');
    await RNFS.unlink(CachesDirectoryPath + '/backup.tmp.db'); //delete Caches
    const u8_byte_array = base64ToBytes(file);

    //自訂名稱
    let name_list = await AsyncStorage.getItem('DBname');
    let custom_name = 'eveApp';
    if (name_list !== null) {
        name_list = JSON.parse(name_list);
        let pos = db_name[0].match(/[0-9]/g) ?? [0];
        pos = parseInt(pos[0]);
        custom_name = name_list[pos];
    }

    //上載檔案
    const file_name = custom_name + moment(new Date()).format('_D/M/YYYY-H:mm:ss.SSS') + '.db';
    const uploader = GDRIVE.files.newResumableUploader();
    const uploader_req = await uploader
        .setDataMimeType('application/x-sqlite3')
        .setRequestBody({
            name: file_name,
            description: 'eveApp Database. Backup on ' + moment(new Date()).format('DD/M/YYY HH:mm:ss'),
            parents: [folder_id],
        })
        .setContentLength(u8_byte_array.length)
        .execute();

    // 可恢復上載
    let try_time = 0;
    while (try_time < 10) {
        try {
            const transferred_byte_count = uploader_req.transferredByteCount;
            console.log('已上傳了 ' + transferred_byte_count + ' / ' + u8_byte_array.length);

            // 上載剩餘部分
            await uploader_req.uploadChunk(u8_byte_array.slice(transferred_byte_count));

            const status = await uploader_req.requestUploadStatus();
            if (status.isComplete) {
                console.log('完成上載 (' + file_name + ')');
                break;
            }
        } catch (e) {
            try_time++;
            console.log('發生中斷嘗試重新上載: ' + try_time);
        }
        if (try_time >= 10) {
            throw new Error('Upload Fall.');
        }
    }
    await AsyncStorage.setItem('Last_Backup', new Date().toISOString());

    //刪除重複版本
    const backup_list = await getBackupList(folder_id);
    const cleaned_backup_list = [];
    const existing_file_names = [];
    for (const file1 of backup_list) {
        const file_name = file1.name;
        if (!existing_file_names.includes(file_name)) {
            cleaned_backup_list.push(file1);
            existing_file_names.push(file_name);
        } else {
            await GDRIVE.files.delete(file1.id);
            console.log('刪除重複版本: ' + file1.name);
        }
    }

    // 刪除舊備份 (保留最近10個備份)
    if (cleaned_backup_list.length > 10) {
        for (let i = 10; i < cleaned_backup_list.length; i++) {
            await GDRIVE.files.delete(cleaned_backup_list[i].id);
            console.log('刪除舊備份: ' + cleaned_backup_list[i].name);
        }
    }
};

/* 進行恢復 */
const doRestore = async file_id => {
    // 下載
    let try_time = 0;
    let u8_byte_array;
    while (try_time < 10) {
        try {
            u8_byte_array = await GDRIVE.files.getBinary(file_id);
            console.log('完成下載');
            break;
        } catch (e) {
            try_time++;
            console.log('發生中斷嘗試重新下載: ' + try_time);
        }
        if (try_time >= 10) {
            throw new Error('Download Fall.');
        }
    }

    // 寫入檔案
    const db_name = (await AsyncStorage.getItem('openDB')).split('.');
    const file = bytesToBase64(u8_byte_array);
    await RNFS.writeFile(CachesDirectoryPath + '/../databases/' + db_name[0] + '.db', file, 'base64');
};

/* 註冊自動備份前台服務 */
notifee.registerForegroundService(notification => {
    return new Promise(async () => {
        console.log('正在進行自動備份');
        try {
            GDRIVE.accessToken = (await GoogleSignin.getTokens()).accessToken;
            const [folder_id] = await getBackupFolderAndLatestDate();
            await doBackup(folder_id);
            console.log('自動備份成功');
        } catch (e) {
            console.error('自動備份失敗: ', e.message);
        } finally {
            await notifee.stopForegroundService();
        }
    });
});

/* 自動備份 */
const autoBackup = async () => {
    try {
        await DB.transaction(async function (tr) {
            const [, rs] = await tr.executeSql(
                "SELECT value FROM Setting WHERE Target IN('AutoBackup', 'AutoBackup_cycle')",
                [],
            );

            const setting = {
                enable: rs.rows.item(0).value === 'On',
                cycle: rs.rows.item(1).value,
            };

            let last_backup = await AsyncStorage.getItem('Last_Backup');
            if (setting.enable) {
                //如果自動備份開啟

                if (last_backup == null) {
                    //如果沒有備份過
                    await notifee.displayNotification({
                        title: '備份進行中...',
                        body: '正在進行自動備份',
                        android: {
                            smallIcon: 'ic_notification',
                            channelId: 'backingup',
                            largeIcon: 'ic_launcher',
                            asForegroundService: true,
                            color: Color.primaryColor,
                            colorized: true,
                            localOnly: true,
                        },
                    }); //顯示通知, start foreground service
                    return;
                }

                const now = new Date();
                const last_backup_date = new Date(last_backup);
                let diff = now.getTime() - last_backup_date.getTime();

                if (
                    (setting.cycle === 'Day' && diff >= 1000 * 60 * 60 * 24) ||
                    (setting.cycle === 'Week' && diff >= 1000 * 60 * 60 * 24 * 7) ||
                    (setting.cycle === 'Month' && diff >= 1000 * 60 * 60 * 24 * 30)
                ) {
                    await notifee.displayNotification({
                        title: '備份進行中...',
                        body: '正在進行自動備份',
                        android: {
                            smallIcon: 'ic_notification',
                            channelId: 'backingup',
                            largeIcon: 'ic_launcher',
                            asForegroundService: true,
                            color: Color.primaryColor,
                            colorized: true,
                            localOnly: true,
                        },
                    }); //顯示通知, start foreground service
                }
            }
        });
    } catch (e) {
        console.error('自動備份檢查失敗', e.message);
        ToastAndroid.show('自動備份檢查失敗', ToastAndroid.SHORT);
        return;
    }

    console.log('自動備份檢查成功');
};

const STYLE = StyleSheet.create({
    list: {
        paddingHorizontal: 5,
        paddingVertical: 10,
    },
    backup: {
        padding: 10,
        borderColor: Color.darkColorLight,
        borderBottomWidth: 0.7,
    },
    logo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 10,
    },
    detail: {
        margin: 10,
        paddingVertical: 8,
        paddingHorizontal: 5,
    },
    row: {
        flexDirection: 'row',
    },
    button: {
        padding: 10,
        borderColor: Color.darkColorLight,
        borderTopWidth: 0.7,
    },
});
export {autoBackup, Backup};
