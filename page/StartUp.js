import React, {useEffect} from 'react';
import {Alert, SafeAreaView, StatusBar, useColorScheme, View} from 'react-native';
import {Headline, useTheme} from 'react-native-paper';
import {openDB} from '../module/SQLite';
import Lottie from 'lottie-react-native';
import {autoBackup} from './Backup';
import PushNotification, {Importance} from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StartUp = ({navigation}) => {
    const {colors} = useTheme();
    const isDarkMode = useColorScheme() === 'dark';

    useEffect(() => {
        createChannel();

        openDB().then(() => {
            autoBackup().then();

            setTimeout(() => {
                alertNewFunction().then();
                navigation.reset({index: 0, routes: [{name: 'Main'}]});
            }, 2500);
        });
    }, []);

    /* 創建通知頻道 */
    const createChannel = () => {
        PushNotification.createChannel(
            {
                channelId: 'backingup', // (required)
                channelName: 'BackingUp Status', // (required)
                channelDescription: '顯示backup資訊',
                importance: Importance.MIN,
                playSound: false,
                vibrate: false,
            },
            created => console.log(`'BackingUp Status' Notification Channel is '${created}'`),
        );
    };

    /* 宣傳新功能 */
    const alertNewFunction = async () => {
        if ((await AsyncStorage.getItem('newFunction')) === '209.2') return;
        Alert.alert(
            '新功能!!',
            '現在長按紀錄可以直接查看圖片囉!!',
            [
                {text: '了解(不再顯示)', onPress: () => AsyncStorage.setItem('newFunction', '209.2')},
                {text: '了解', onPress: () => {}},
            ],
            {cancelable: true},
        );
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
