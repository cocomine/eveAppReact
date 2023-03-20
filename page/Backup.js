import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    FlatList,
    Image,
    Linking,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    ToastAndroid,
    useColorScheme,
    View,
} from 'react-native';
import {Color} from '../module/Color';
import {Appbar, Button, Dialog, Headline, Portal, Subheading, Switch, Text, Title, useTheme} from 'react-native-paper';
import {RadioButton, RadioGroup} from '../module/RadioButton';
import Lottie from 'lottie-react-native';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import {GDrive, ListQueryBuilder, MimeTypes} from '@robinbobin/react-native-google-drive-api-wrapper';
import RNFS, {CachesDirectoryPath} from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import {closeDB, DB, openDB} from '../module/SQLite';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {FoldIn, FoldOut} from '../module/Fold';
import {Ripple} from '../module/Ripple';
import SVGLostCargo from '../module/SVGLostCargo';
import {base64ToBytes, bytesToBase64} from 'byte-base64';
import PushNotification from 'react-native-push-notification';

/* google設定 */
GoogleSignin.configure({scopes: ['https://www.googleapis.com/auth/drive.file', 'profile']});
GoogleSignin.signInSilently()
    .then(e => console.log('Google API Login: ' + e.user.email))
    .catch(e => console.log('Google API Error: ' + e.message));
const gdrive = new GDrive();

const Backup = ({navigation}) => {
    const {colors} = useTheme();
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;

    const [isLogin, setIsLogin] = useState(false); //登入狀態
    const [userInfo, setUserInfo] = useState({user: null}); //用戶資料
    const [newBackupDate, setNewBackupDate] = useState(null); //最新備份日期
    const [BackingUp, setBackingUp] = useState(false); //備份中彈出視窗
    const [Restoring, setRestoring] = useState(false); //備份中彈出視窗
    const [fileList, setFileList] = useState(null); //恢復中彈出視窗
    const [autoBackupEnable, setAutoBackupEnable] = useState(false); //自動備份狀態
    const [autoBackupCycle, setAutoBackupCycle] = useState('Week'); //自動備份狀態
    const folderID = useRef(null); //資料夾id

    /* 初始化 */
    useEffect(() => {
        const startup = async () => {
            const isLogin = await GoogleSignin.isSignedIn();
            if (isLogin) {
                const userinfo = await GoogleSignin.getCurrentUser();
                setUserInfo({...userinfo});
                setIsLogin(isLogin);

                const [folder, BackupDate] = await listAllBackup();
                folderID.current = folder;
                setNewBackupDate(BackupDate ? BackupDate : '');
            } else {
                ToastAndroid.show('連接已斷開, 請重新連接', ToastAndroid.SHORT);
            }
        };
        startup()
            .then()
            .catch(() => ToastAndroid.show('發生錯誤請, 檢查網絡狀態', ToastAndroid.SHORT));

        DB.transaction(
            function (tr) {
                tr.executeSql(
                    "SELECT value FROM Setting WHERE Target IN('AutoBackup', 'AutoBackup_cycle')",
                    [],
                    (tr, rs) => {
                        setAutoBackupEnable(rs.rows.item(0).value === 'On');
                        setAutoBackupCycle(rs.rows.item(1).value);
                        //console.log(rs.rows.item(0).value, rs.rows.item(1).value)
                    },
                );
            },
            function (e) {
                console.log('自動備份獲取資料失敗', e.message);
            },
        );
    }, []);

    /* 斷開連接 */
    const unlink = useCallback(async () => {
        await GoogleSignin.signOut();
        setUserInfo({user: null});
        setIsLogin(false);
        setNewBackupDate(null);
        folderID.current = null;
        ToastAndroid.show('連接已斷開', ToastAndroid.SHORT);
    }, []);

    /* 連接 */
    const link = useCallback(async () => {
        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

        try {
            const userinfo = await GoogleSignin.signIn();
            setUserInfo({...userinfo});
            setIsLogin(true);

            const [folder, BackupDate] = await listAllBackup();
            folderID.current = folder;
            setNewBackupDate(BackupDate);
        } catch (error) {
            console.log(error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                ToastAndroid.show('已取消連結', ToastAndroid.SHORT);
            } else if (error.code === statusCodes.IN_PROGRESS) {
                ToastAndroid.show('連結仍在進行中', ToastAndroid.SHORT);
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                ToastAndroid.show('Google Play service不可用', ToastAndroid.SHORT);
            } else {
                ToastAndroid.show('未知其他錯誤: ' + error.code, ToastAndroid.SHORT);
            }
            await unlink();
        }
    }, []);

    /* 備份 */
    const backup = useCallback(() => {
        setBackingUp(true);
        closeDB();
        doBackup(folderID.current)
            .then(() => ToastAndroid.show('備份成功', ToastAndroid.SHORT))
            .catch(e => {
                ToastAndroid.show('備份失敗', ToastAndroid.SHORT);
                console.log('備份失敗: ' + e.message);
                console.log(e);
            })
            .finally(() => {
                listAllBackup().then(([folder, BackupDate]) => {
                    folderID.current = folder;
                    setNewBackupDate(BackupDate);
                });
                openDB().then(r => {
                    setBackingUp(false);
                });
            });
    }, []);

    /* 恢復列表 */
    const restoreList = useCallback(() => {
        backupList(folderID.current).then(e => {
            setFileList(e.files);
        });
    }, []);

    /* 關閉恢復列表 */
    const closeRestoreList = useCallback(() => {
        setFileList(null);
    }, []);

    /* 恢復 */
    const restore = useCallback(fileID => {
        setRestoring(true);
        setFileList(null);
        closeDB();
        doRestore(fileID)
            .then(() => ToastAndroid.show('恢復成功', ToastAndroid.SHORT))
            //.catch(() => ToastAndroid.show('恢復失敗', ToastAndroid.SHORT))
            .finally(() => {
                openDB().then(() => {
                    setRestoring(false);
                });
            });
    }, []);

    /* 處理退出頁面 阻止退出 */
    useEffect(() => {
        //處理
        return navigation.addListener('beforeRemove', e => {
            //清除活動監聽器
            if (BackingUp || Restoring) {
                e.preventDefault();
            } //阻止退出
        });
    }, [navigation, BackingUp, Restoring]);

    /* 開關自動備份 */
    const switchAutoBackup = useCallback(status => {
        setAutoBackupEnable(status);

        const checked = status ? 'On' : 'Off';
        DB.transaction(
            function (tr) {
                tr.executeSql("UPDATE Setting SET value = ? WHERE Target = 'AutoBackup'", [checked]);
            },
            function (e) {
                console.log('自動備份更新失敗', e.message);
            },
            function () {
                console.log('自動備份更新成功');
            },
        );
    }, []);

    /* 設置自動備份週期 */
    const changeAutoBackupCycle = useCallback(value => {
        DB.transaction(
            function (tr) {
                tr.executeSql("UPDATE Setting SET value = ? WHERE Target = 'AutoBackup_cycle'", [value]);
            },
            function (e) {
                console.log('自動備份週期更新失敗', e.message);
            },
            function () {
                console.log('自動備份週期更新成功');
            },
        );
    }, []);

    return (
        <SafeAreaView style={{flex: 1}}>
            {/*<React.StrictMode>*/}
            <StatusBar backgroundColor={Color.primaryColor} barStyle={'light-content'} animated={true} />
            <Appbar.Header style={{backgroundColor: Color.primaryColor}}>
                <Appbar.BackAction onPress={navigation.goBack} />
                <Appbar.Content title={'備份'} color={Color.white} />
                <Appbar.Action icon={'link-variant-off'} onPress={unlink} disabled={!isLogin} />
            </Appbar.Header>
            <View style={{flex: 1, justifyContent: 'space-between'}}>
                <View>
                    <View style={[style.backup, {backgroundColor: BG_color}]}>
                        <View style={style.logo}>
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
                        <View style={[style.detail, {backgroundColor: colors.background}]}>
                            <View style={style.row}>
                                <Text style={{flex: 1 / 3}}>最新備份:</Text>
                                <Text style={{flex: 1, color: Color.blue}} ellipsizeMode={'tail'} numberOfLines={1}>
                                    {newBackupDate}
                                </Text>
                            </View>
                            <View style={style.row}>
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
                            <View style={style.row}>
                                <Text style={{flex: 1 / 3}}>Email:</Text>
                                <Text style={{flex: 1}} ellipsizeMode={'tail'} numberOfLines={1}>
                                    {userInfo.user ? userInfo.user.email : null}
                                </Text>
                            </View>
                        </View>
                    </View>
                    {isLogin ? (
                        <Animated.View
                            style={[style.backup, {backgroundColor: BG_color}]}
                            entering={FoldIn}
                            exiting={FoldOut}>
                            <View style={style.logo}>
                                <Title>自動備份:</Title>
                                <Switch
                                    value={autoBackupEnable}
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
                                    selected={autoBackupCycle === 'Day'}
                                />
                                <RadioButton
                                    value={'Week'}
                                    label={'每週'}
                                    color={Color.primaryColor}
                                    selected={autoBackupCycle === 'Week'}
                                />
                                <RadioButton
                                    value={'Month'}
                                    label={'每月'}
                                    color={Color.primaryColor}
                                    selected={autoBackupCycle === 'Month'}
                                />
                            </RadioGroup>
                        </Animated.View>
                    ) : null}
                </View>
                <View style={[style.button, {backgroundColor: BG_color}]}>
                    <View style={{display: isLogin ? 'none' : undefined}}>
                        <Button mode={'contained'} buttonColor={Color.green} icon={'link-variant'} onPress={link}>
                            連接
                        </Button>
                    </View>
                    <View style={[style.row, {display: !isLogin ? 'none' : undefined}]}>
                        <Button
                            mode={'outlined'}
                            style={{
                                flex: 1,
                                marginRight: 5,
                            }}
                            icon={'backup-restore'}
                            onPress={restoreList}
                            disabled={newBackupDate === null}>
                            恢復
                        </Button>
                        <Button
                            mode={'contained'}
                            style={{flex: 1}}
                            icon={'cloud-upload'}
                            onPress={backup}
                            disabled={newBackupDate === null}>
                            備份
                        </Button>
                    </View>
                </View>
            </View>
            <Portal>
                {BackingUp ? (
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
                {Restoring ? (
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
                <Dialog onDismiss={closeRestoreList} visible={fileList != null} style={{maxHeight: '100%', top: -15}}>
                    <Dialog.Title>恢復備份</Dialog.Title>
                    <Dialog.ScrollArea>
                        <FlatList
                            data={fileList ?? []}
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
        </SafeAreaView>
    );
};

/* 恢復列表item */
const RestoreList = ({data, onPress}) => {
    return (
        <Ripple.Default onPress={onPress}>
            <View style={style.list}>
                <Subheading>{data.name}</Subheading>
            </View>
        </Ripple.Default>
    );
};

/* 備份檔案列表 */
const backupList = async folderID => {
    return await gdrive.files.list({
        q: new ListQueryBuilder().e('parents', folderID).and().e('trashed', false),
        orderBy: 'createdTime desc',
    });
};

/* 列出所有備份 */
const listAllBackup = async () => {
    gdrive.accessToken = (await GoogleSignin.getTokens()).accessToken;
    const list = await gdrive.files.list({
        q: new ListQueryBuilder()
            .e('name', 'eveApp')
            .and()
            .e('mimeType', 'application/vnd.google-apps.folder')
            .and()
            .e('trashed', false),
    });

    let folderID = list.files[0] ? list.files[0].id : null;
    // 不存在創建文件夾
    if (folderID === null) {
        const tmp = await gdrive.files
            .newMetadataOnlyUploader()
            .setRequestBody({
                name: 'eveApp',
                mimeType: MimeTypes.FOLDER,
                parent: ['root'],
                description: 'eveApp Database folder.',
            })
            .execute();
        folderID = tmp.id;
    }

    // 設置最新日期
    const backup_list = await backupList(folderID);
    let CreateTime = backup_list.files[0]
        ? backup_list.files[0].name.match(/[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}-[0-9]{1,2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}/g)
        : [''];

    return [folderID, CreateTime[0]];
};

/* 進行備份 */
const doBackup = async folderID => {
    //讀取檔案
    const dbname = (await AsyncStorage.getItem('openDB')).split('.');
    await RNFS.copyFile(
        CachesDirectoryPath + '/../databases/' + dbname[0] + '.db',
        CachesDirectoryPath + '/backup.tmp.db',
    ); //copy to Caches folder
    const file = await RNFS.readFile(CachesDirectoryPath + '/backup.tmp.db', 'base64');
    await RNFS.unlink(CachesDirectoryPath + '/backup.tmp.db'); //delete Caches
    const U8byteArray = base64ToBytes(file);

    //自訂名稱
    let name_list = await AsyncStorage.getItem('DBname');
    let custom_name = 'eveApp';
    if (name_list !== null) {
        name_list = JSON.parse(name_list);
        let pos = dbname[0].match(/[0-9]/g) ?? [0];
        pos = parseInt(pos[0]);
        custom_name = name_list[pos];
    }

    //上載檔案
    const fileName = custom_name + moment(new Date()).format('_D/M/YYYY-H:mm:ss.SSS') + '.db';
    const uploader = gdrive.files.newResumableUploader();
    await uploader
        .setDataType('application/x-sqlite3')
        .setRequestBody({
            name: fileName,
            description: 'eveApp Database. Backup on ' + moment(new Date()).format('DD/M/YYY HH:mm:ss'),
            parents: [folderID],
        })
        .execute();

    // 可恢復上載
    let tryTime = 0;
    while (tryTime < 10) {
        try {
            await uploader.uploadChunk(U8byteArray);
            console.log('完成上載 (' + fileName + ')');
            break;
        } catch (e) {
            tryTime++;
            console.log('發生中斷嘗試重新上載: ' + tryTime);
        }
        if (tryTime >= 10) {
            throw new Error('Upload Fall.');
        }
    }
    const status = await uploader.requestUploadStatus();

    if (!status.isComplete) {
        throw new Error('Upload is not complete.');
    }
    await AsyncStorage.setItem('Last_Backup', new Date().toISOString());
    return status.isComplete;
};

/* 進行恢復 */
const doRestore = async fileID => {
    // 下載
    let tryTime = 0;
    let U8byteArray;
    while (tryTime < 10) {
        try {
            U8byteArray = await gdrive.files.getBinary(fileID);
            console.log('完成下載');
            break;
        } catch (e) {
            tryTime++;
            console.log('發生中斷嘗試重新下載: ' + tryTime);
        }
        if (tryTime >= 10) {
            throw new Error('Download Fall.');
        }
    }

    // 寫入檔案
    const dbname = (await AsyncStorage.getItem('openDB')).split('.');
    const file = bytesToBase64(U8byteArray);
    await RNFS.writeFile(CachesDirectoryPath + '/../databases/' + dbname[0] + '.db', file, 'base64');
};

/* 自動備份 */
const autoBackup = async () => {
    DB.transaction(
        function (tr) {
            tr.executeSql(
                "SELECT value FROM Setting WHERE Target IN('AutoBackup', 'AutoBackup_cycle')",
                [],
                async (tr, rs) => {
                    const setting = {enable: rs.rows.item(0).value === 'On', cycle: rs.rows.item(1).value};

                    let Last_Backup = await AsyncStorage.getItem('Last_Backup');
                    if (Last_Backup && setting.enable) {
                        const now = new Date();
                        const Last_Backup_Date = new Date(Last_Backup);
                        let diff = now.getTime() - Last_Backup_Date.getTime();

                        if (
                            (setting.cycle === 'Day' && diff >= 1000 * 60 * 60 * 24) ||
                            (setting.cycle === 'Week' && diff >= 1000 * 60 * 60 * 24 * 7) ||
                            (setting.cycle === 'Month' && diff >= 1000 * 60 * 60 * 24 * 30)
                        ) {
                            //推出通知
                            PushNotification.localNotification({
                                channelId: 'backingup',
                                id: 1,
                                title: '備份進行中', // (optional)
                                message: '正在進行自動備份', // (required)
                                largeIcon: 'ic_launcher',
                                smallIcon: 'ic_notification',
                                ongoing: true,
                            });
                            console.log('正在進行自動備份');

                            //進行備份
                            const [folderID] = await listAllBackup();
                            await doBackup(folderID);

                            //取消通知
                            PushNotification.cancelLocalNotification(1);
                            console.log('自動備份成功');
                        }
                    }
                },
            );
        },
        function (e) {
            console.log('自動備份檢查失敗', e.message);
        },
        function () {
            console.log('自動備份檢查成功');
        },
    );
};

const style = StyleSheet.create({
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
