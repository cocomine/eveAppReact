import React, {useCallback, useEffect} from 'react';
import {Alert, SafeAreaView, StatusBar, ToastAndroid, useColorScheme, View} from 'react-native';
import {Headline, useTheme} from 'react-native-paper';
import {openDB} from '../module/SQLite';
import Lottie from 'lottie-react-native';
import {autoBackup} from './Backup';
import SpInAppUpdates, {IAUUpdateKind} from 'sp-react-native-in-app-updates';
import notifee, {AndroidImportance, AuthorizationStatus} from '@notifee/react-native';

const inAppUpdates = new SpInAppUpdates(false);

const StartUp = ({navigation}) => {
    const {colors} = useTheme();
    const isDarkMode = useColorScheme() === 'dark';

    useEffect(() => {
        createChannel().then();
        inAppUpdate().then();

        openDB().then(() => {
            autoBackup().then();

            setTimeout(() => {
                navigation.reset({index: 0, routes: [{name: 'Main'}]});
            }, 2500);
        });
    }, [createChannel, navigation]);

    /* 創建通知頻道 */
    const createChannel = useCallback(async () => {
        // Request permissions (required for iOS)
        const settings = await notifee.requestPermission();

        if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
            console.log('User denied permissions request');
            ToastAndroid.show('您已拒絕通知權限，無法顯示備份狀態', ToastAndroid.LONG);
        } else if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
            console.log('User granted permissions request');
        } else if (settings.authorizationStatus === AuthorizationStatus.PROVISIONAL) {
            console.log('User provisionally granted permissions request');
        }

        // Create a channel (required for Android)
        const channelId = await notifee.createChannel({
            id: 'backingup',
            name: 'BackingUp Status',
            description: '顯示backup資訊',
            importance: AndroidImportance.MIN,
            badge: false,
            lights: false,
            vibration: false,
        });

        console.log("'BackingUp Status' Notification Channel is created");
    }, []);

    /* Google play 程式更新 */
    const inAppUpdate = async () => {
        const result = await inAppUpdates.checkNeedsUpdate({curVersion: '2.1.11'});
        if (result.shouldUpdate) {
            Alert.alert(
                'Google Play上有新版本可用!!',
                '我們建議您將程式更新至最新版本',
                [
                    {
                        text: '立即更新',
                        onPress: () => inAppUpdates.startUpdate({updateType: IAUUpdateKind.IMMEDIATE}),
                    },
                    {
                        text: '稍後更新',
                        onPress: () => {},
                    },
                ],
                {cancelable: true},
            );
        }
    };

    return (
        <SafeAreaView style={{flex: 1}}>
            <StatusBar
                backgroundColor={colors.background}
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                animated={true}
            />
            <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
                <Lottie
                    source={require('../resource/Cargo.json')}
                    autoPlay={true}
                    loop={false}
                    style={{width: 200, height: 200}}
                />
                <Headline style={{paddingTop: 40}}>運輸紀錄</Headline>
            </View>
        </SafeAreaView>
    );
};

export {StartUp};
