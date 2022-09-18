import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Image, Linking, SafeAreaView, StatusBar, StyleSheet, ToastAndroid, useColorScheme, View} from 'react-native';
import {Color} from '../module/Color';
import {Appbar, Button, Headline, Portal, Switch, Text, Title, useTheme} from 'react-native-paper';
import {RadioButton, RadioGroup} from '../module/RadioButton';
import Lottie from 'lottie-react-native';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import {GDrive, ListQueryBuilder, MimeTypes} from '@robinbobin/react-native-google-drive-api-wrapper';
import RNFS, {CachesDirectoryPath} from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import {closeDB, openDB} from '../module/SQLite';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {FoldIn, FoldOut} from '../module/Fold';

/* google設定 */
GoogleSignin.configure({scopes: ['https://www.googleapis.com/auth/drive.file', 'profile']});
GoogleSignin.signInSilently().then((e) => console.log('Google API: ' + e.user.email)).catch((e) => console.log('Google API Error: ' + e.message));
const gdrive = new GDrive();

const Backup = ({navigation}) => {
    const {colors} = useTheme();
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;

    const [isLogin, setIsLogin] = useState(false); //登入狀態
    const [userInfo, setUserInfo] = useState({user: null}); //用戶資料
    const [newBackupDate, setNewBackupDate] = useState(null); //最新備份日期
    const [BackingUp, setBackingUp] = useState(false); //備份中彈出視窗
    const folderID = useRef(null); //資料夾id

    /* 初始化 */
    useEffect(() => {
        const startup = async() => {
            const isLogin = await GoogleSignin.isSignedIn();
            if(isLogin){
                const userinfo = await GoogleSignin.getCurrentUser();
                setUserInfo({...userinfo});
                setIsLogin(isLogin);

                const [folder, BackupDate] = await listAllBackup();
                folderID.current = folder;
                setNewBackupDate(BackupDate);
            }else{
                ToastAndroid.show('連接已斷開, 請重新連接', ToastAndroid.SHORT);
            }
        };

        startup().then();
    }, []);

    /* 斷開連接 */
    const unlink = useCallback(async() => {
        await GoogleSignin.signOut();
        setUserInfo({user: null});
        setIsLogin(false);
        setNewBackupDate(null);
        folderID.current = null;
        ToastAndroid.show('連接已斷開', ToastAndroid.SHORT);
    }, []);

    /* 連接 */
    const link = useCallback(async() => {
        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

        try{
            const userinfo = await GoogleSignin.signIn();
            setUserInfo({...userinfo});
            setIsLogin(true);

            const [folder, BackupDate] = await listAllBackup();
            folderID.current = folder;
            setNewBackupDate(BackupDate);
        }catch(error){
            console.log(error);
            if(error.code === statusCodes.SIGN_IN_CANCELLED){
                ToastAndroid.show('已取消連結', ToastAndroid.SHORT);
            }else if(error.code === statusCodes.IN_PROGRESS){
                ToastAndroid.show('連結仍在進行中', ToastAndroid.SHORT);
            }else if(error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE){
                ToastAndroid.show('Google Play service不可用', ToastAndroid.SHORT);
            }else{
                ToastAndroid.show('未知其他錯誤: ' + error.message, ToastAndroid.SHORT);
            }
        }
    }, []);

    /* 備份 */
    const backup = useCallback(() => {
        setBackingUp(true);
        closeDB();
        doBackup(folderID.current).then((status) => {
            if(!status) ToastAndroid.show('備份失敗', ToastAndroid.SHORT);
            ToastAndroid.show('備份成功', ToastAndroid.SHORT);
        }).catch((e) => {
            //ToastAndroid.show('備份失敗', ToastAndroid.SHORT);
            console.log(e);
        }).finally(() => {
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

    }, []);

    /* 恢復 */
    const restore = useCallback((fileID) => {

    }, []);

    //debug
    useEffect(() => {
        console.log(isLogin, userInfo);
    });

    return (
        <SafeAreaView style={{flex: 1}}>
            <StatusBar backgroundColor={Color.primaryColor} barStyle={'light-content'} animated={true}/>
            <Appbar.Header style={{backgroundColor: Color.primaryColor}}>
                <Appbar.BackAction onPress={navigation.goBack}/>
                <Appbar.Content title={'備份'} color={Color.white}/>
                <Appbar.Action icon={'link-variant-off'} onPress={unlink} disabled={!isLogin}/>
            </Appbar.Header>
            <View style={{flex: 1, justifyContent: 'space-between'}}>
                <View>
                    <View style={[style.backup, {backgroundColor: BG_color}]}>
                        <View style={style.logo}>
                            <Headline>Google雲端備份</Headline>
                            <Image source={require('../resource/google-drive-logo2.png')} style={{
                                width: 141.91,
                                height: 38.67
                            }} resizeMode={'contain'}/>
                        </View>
                        <Text>你可以手動將資料備份至google雲端硬碟。你可以隨時從google雲端硬碟中恢復資料。</Text>
                        <View style={[style.detail, {backgroundColor: colors.background}]}>
                            <View style={style.row}>
                                <Text style={{flex: 1 / 3}}>最新備份:</Text>
                                <Text style={{flex: 1, color: Color.blue}} ellipsizeMode={'tail'} numberOfLines={1}>{newBackupDate}</Text>
                            </View>
                            <View style={style.row}>
                                <Text style={{flex: 1 / 3}}>URL:</Text>
                                <Text style={{flex: 1, textDecorationLine: 'underline', color: Color.green}} ellipsizeMode={'tail'} numberOfLines={1}
                                      onPress={() => Linking.openURL('https://drive.google.com')}>https://drive.google.com
                                </Text>
                            </View>
                            <View style={style.row}>
                                <Text style={{flex: 1 / 3}}>Email:</Text>
                                <Text style={{flex: 1}} ellipsizeMode={'tail'} numberOfLines={1}>{userInfo.user ? userInfo.user.email : null}</Text>
                            </View>
                        </View>
                    </View>
                    {isLogin ?
                        <Animated.View style={[style.backup, {backgroundColor: BG_color}]} entering={FoldIn} exiting={FoldOut}>
                            <View style={style.logo}>
                                <Title>自動備份:</Title>
                                <Switch value={true} color={Color.primaryColor} onValueChange={() => null}/>
                            </View>
                            <RadioGroup containerStyle={{
                                justifyContent: 'space-between',
                                width: '100%',
                                paddingHorizontal: 20
                            }} onPress={(value) => null}>
                                <RadioButton value={'Day'} label={'每日'} color={Color.primaryColor} selected={false}/>
                                <RadioButton value={'Week'} label={'每週'} color={Color.primaryColor} selected={false}/>
                                <RadioButton value={'Month'} label={'每月'} color={Color.primaryColor} selected={true}/>
                            </RadioGroup>
                        </Animated.View> : null}
                </View>
                <View style={[style.button, {backgroundColor: BG_color}]}>
                    <View style={{display: isLogin ? 'none' : undefined}}>
                        <Button mode={'contained'} buttonColor={Color.green} icon={'link-variant'} onPress={link}>連接</Button>
                    </View>
                    <View style={[style.row, {display: !isLogin ? 'none' : undefined}]}>
                        <Button mode={'outlined'} style={{flex: 1, marginRight: 5}} icon={'backup-restore'}>恢復</Button>
                        <Button mode={'contained'} style={{flex: 1}} icon={'cloud-upload'} onPress={backup} disabled={newBackupDate === null}>備份</Button>
                    </View>
                </View>
            </View>
            <Portal>
                {BackingUp ?
                    <Animated.View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.74)'}} entering={FadeIn} exiting={FadeOut}>
                        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                            <Lottie source={require('../resource/upload.json')} autoPlay={true} loop={true} style={{
                                width: 300,
                                height: 300
                            }}/>
                            <Title style={{color: Color.white, paddingTop: 40}}>備份中...</Title>
                        </View>
                    </Animated.View> : null}
            </Portal>
        </SafeAreaView>
    );
};

/* 備份檔案列表 */
const backupList = async(folderID) => {
    return await gdrive.files.list({
        q: new ListQueryBuilder()
            .e('parents', folderID),
        orderBy: 'createdTime desc'
    });
};

/* 列出所有備份 */
const listAllBackup = async() => {
    gdrive.accessToken = (await GoogleSignin.getTokens()).accessToken;
    const list = await gdrive.files.list({
        q: new ListQueryBuilder()
            .e('name', 'eveApp')
            .and()
            .e('mimeType', 'application/vnd.google-apps.folder')
            .and()
            .e('trashed', false)
    });

    let folderID = list.files[0] ? list.files[0].id : null;
    // 不存在創建文件夾
    if(folderID === null){
        const tmp = await gdrive.files.newMetadataOnlyUploader().setRequestBody({
            name: 'eveApp',
            mimeType: MimeTypes.FOLDER,
            parent: ['root'],
            description: 'eveApp Database folder.'
        }).execute();
        folderID = tmp.id;
    }

    // 設置最新日期
    const backup_list = await backupList(folderID);
    let CreateTime = backup_list.files[0] ? backup_list.files[0].name.match(
        /[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}-[0-9]{1,2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}/g) : [null];

    return [folderID, CreateTime[0]];
};

/* 進行備份 */
const doBackup = async(folderID) => {
    //讀取檔案
    const dbname = (await AsyncStorage.getItem('openDB')).split('.');
    const file = await RNFS.readFile(CachesDirectoryPath + '/../databases/' + dbname[0] + '.db', 'base64');
    const byteCharacters = atob(file);
    const byteArray = new Array(byteCharacters.length);
    for(let i = 0 ; i < byteCharacters.length ; i++){
        byteArray[i] = byteCharacters.charCodeAt(i);
    }

    //自訂名稱
    let name_list = await AsyncStorage.getItem('DBname');
    let custom_name = 'eveApp';
    if(name_list !== null){
        name_list = JSON.parse(name_list);
        let pos = dbname[0].match(/[0-9]/g) ?? [0];
        pos = parseInt(pos[0]);
        custom_name = name_list[pos];
    }

    //上載檔案
    const fileName = custom_name + moment(new Date).format('_D/M/YYYY-H:mm:ss.SSS') + '.db';
    const uploader = gdrive.files.newResumableUploader();
    await uploader.setData(byteArray, 'application/x-sqlite3')
                  .setRequestBody({
                      name: fileName,
                      description: 'eveApp Database. Backup on ' + moment(new Date).format('DD/M/YYY HH:mm:ss'),
                      parents: [folderID]
                  }).execute();

    const status = await uploader.requestUploadStatus();
    console.log(status);
    return status.isComplete;
};

const style = StyleSheet.create({
    backup: {
        padding: 10, borderColor: Color.darkColorLight, borderBottomWidth: 0.7
    },
    logo: {
        flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10
    },
    detail: {
        margin: 10,
        paddingVertical: 8,
        paddingHorizontal: 5
    },
    row: {
        flexDirection: 'row'
    },
    button: {
        padding: 10,
        borderColor: Color.darkColorLight,
        borderTopWidth: 0.7
    }
});
export {Backup};