import React, {useEffect} from 'react';
import {Alert, SafeAreaView, StatusBar, useColorScheme, View} from 'react-native';
import {Headline, useTheme} from 'react-native-paper';
import {openDB} from '../module/SQLite';
import Lottie from 'lottie-react-native';
import {autoBackup} from './Backup';
import SpInAppUpdates, {IAUUpdateKind} from 'sp-react-native-in-app-updates';

const inAppUpdates = new SpInAppUpdates(false);

const StartUp = ({navigation}) => {
    const {colors} = useTheme();
    const isDarkMode = useColorScheme() === 'dark';

    useEffect(() => {
        createChannel();
        inAppUpdate().then();

        openDB().then(() => {
            autoBackup().then();

            setTimeout(() => {
                navigation.reset({index: 0, routes: [{name: 'Main'}]});
            }, 2500);
        });
    }, []);

    /* 創建通知頻道 */
    const createChannel = () => {
        /*PushNotification.createChannel(
            {
                channelId: 'backingup', // (required)
                channelName: 'BackingUp Status', // (required)
                channelDescription: '顯示backup資訊',
                importance: Importance.MIN,
                playSound: false,
                vibrate: false,
            },
            created => console.log(`'BackingUp Status' Notification Channel is '${created}'`),
        );*/
    };

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
