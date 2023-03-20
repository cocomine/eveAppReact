/**
 * @format
 */

import {Alert, AppRegistry, Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {decode, encode} from 'base-64';
import PushNotification from 'react-native-push-notification';
import RNRestart from 'react-native-restart';
import {setJSExceptionHandler, setNativeExceptionHandler} from 'react-native-exception-handler';

if (!global.btoa) {
    global.btoa = encode;
}
if (!global.atob) {
    global.atob = decode;
}

PushNotification.configure({
    // (optional) Called when Token is generated (iOS and Android)
    onRegister: function (token) {
        console.log('TOKEN:', token);
    },
    // (required) Called when a remote is received or opened, or local notification is opened
    onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
    },
    // IOS ONLY (optional): default: all - Permissions to register.
    permissions: {
        alert: true,
        badge: true,
        sound: true,
    },
    requestPermissions: Platform.OS === 'ios',
});

setJSExceptionHandler((error, isFatal) => {
    Alert.alert('發生錯誤', isFatal ? 'Fatal: ' : '' + error.name + '\n' + error.message + '\n程式將重新啟動', [
        {
            text: '重新啟動',
            onPress: () => RNRestart.Restart(),
        },
    ]);
});

setNativeExceptionHandler(errorString => {});

AppRegistry.registerComponent(appName, () => App);
