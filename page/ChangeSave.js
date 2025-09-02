import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, ToastAndroid, View} from 'react-native';
import {Caption, Divider, List, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import FW5Icon from '@react-native-vector-icons/fontawesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';
import RNFS, {CachesDirectoryPath} from 'react-native-fs';
import prompt from 'react-native-prompt-android';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle} from 'react-native-reanimated';

const ChangeSave = () => {
    const [dbname, set_dbname] = useState([]);

    /* 讀取名稱 */
    useEffect(() => {
        const get_dbname = async () => {
            //await AsyncStorage.removeItem('DBname')
            let dbname1 = await AsyncStorage.getItem('DBname');
            if (dbname1 === null) {
                //名稱不存在
                dbname1 = ['未命名', null, null, null, null, null, null, null, null, null];
                await AsyncStorage.setItem('DBname', JSON.stringify(dbname1));
                return dbname1;
            }
            return JSON.parse(dbname1);
        };

        //讀取名稱
        get_dbname().then(dbname2 => {
            let tmp = dbname2.map(item => {
                if (item === null) return null;
                return item;
            });
            set_dbname(tmp);
        });
    }, []);

    /* 打開資料庫 */
    const openDB = useCallback(
        async db_number => {
            await AsyncStorage.setItem('openDB', 'eveApp' + (db_number === 0 ? '' : db_number) + '.db');

            //新存檔
            if (dbname[db_number] === null) {
                dbname[db_number] = '未命名';
                await AsyncStorage.setItem('DBname', JSON.stringify(dbname));
                set_dbname([...dbname]);
            }

            restartApp();
        },
        [dbname],
    );

    /* 更改名稱 */
    const changeName = useCallback(
        db_number => {
            const change = async name => {
                if (!/\S+/g.test(name)) {
                    ToastAndroid.show('輸入格式不正確', ToastAndroid.SHORT);
                    return;
                }
                dbname[db_number] = name;
                set_dbname([...dbname]);
                await AsyncStorage.setItem('DBname', JSON.stringify(dbname));
            };

            prompt('存檔名稱', '請輸入名稱', [{text: '取消'}, {text: '確認', onPress: change}], {
                cancelable: true,
                defaultValue: dbname[db_number],
            });
        },
        [dbname],
    );

    /* 刪除 */
    const deleteDB = useCallback(
        async db_number => {
            if ((await AsyncStorage.getItem('openDB')) === 'eveApp' + (db_number === 0 ? '' : db_number) + '.db') {
                ToastAndroid.show('不能刪除已開啟存檔', ToastAndroid.SHORT);
                return;
            }

            const del = async () => {
                //刪除名稱
                dbname[db_number] = null;
                set_dbname([...dbname]);
                await AsyncStorage.setItem('DBname', JSON.stringify(dbname));
                //刪除檔案
                await RNFS.unlink(
                    CachesDirectoryPath + '/../databases/eveApp' + (db_number === 0 ? '' : db_number) + '.db',
                ).catch(() => null);
                await RNFS.unlink(
                    CachesDirectoryPath + '/../databases/eveApp' + (db_number === 0 ? '' : db_number) + '.db-journal',
                ).catch(() => null);
            };

            //檔案不存在
            if (dbname[db_number] === null) {
                ToastAndroid.show('該位置沒有存檔', ToastAndroid.SHORT);
                return;
            }
            Alert.alert('刪除', '確認刪除?', [{text: '確認', onPress: del}, {text: '取消'}], {cancelable: true});
        },
        [dbname],
    );

    return (
        <SafeAreaView style={{flex: 1}}>
            <StatusBar backgroundColor={Color.primaryColor} barStyle={'light-content'} animated={true} />
            {/*<React.StrictMode>*/}
            <ScrollView>
                <View style={{paddingHorizontal: 10, paddingTop: 10}}>
                    <Caption>不同存檔之間的數據及設定均是獨立並不通用, 最多只能開十個存檔</Caption>
                    <Caption>(名稱只作用識別用途, 不會更改真實檔案名稱)</Caption>
                    <Caption>單擊→開啟, 長按→改名, 滑動→刪除</Caption>
                </View>
                <ListItem
                    title={dbname[0]}
                    description="eveApp.db"
                    onPress={() => openDB(0)}
                    onLongPress={() => changeName(0)}
                    onSwipe={() => deleteDB(0)}
                />
                <ListItem
                    title={dbname[1]}
                    description="eveApp1.db"
                    onPress={() => openDB(1)}
                    onLongPress={() => changeName(1)}
                    onSwipe={() => deleteDB(1)}
                />
                <ListItem
                    title={dbname[2]}
                    description="eveApp2.db"
                    onPress={() => openDB(2)}
                    onLongPress={() => changeName(2)}
                    onSwipe={() => deleteDB(2)}
                />
                <ListItem
                    title={dbname[3]}
                    description="eveApp3.db"
                    onPress={() => openDB(3)}
                    onLongPress={() => changeName(3)}
                    onSwipe={() => deleteDB(3)}
                />
                <ListItem
                    title={dbname[4]}
                    description="eveApp4.db"
                    onPress={() => openDB(4)}
                    onLongPress={() => changeName(4)}
                    onSwipe={() => deleteDB(4)}
                />
                <ListItem
                    title={dbname[5]}
                    description="eveApp5.db"
                    onPress={() => openDB(5)}
                    onLongPress={() => changeName(5)}
                    onSwipe={() => deleteDB(5)}
                />
                <ListItem
                    title={dbname[6]}
                    description="eveApp6.db"
                    onPress={() => openDB(6)}
                    onLongPress={() => changeName(6)}
                    onSwipe={() => deleteDB(6)}
                />
                <ListItem
                    title={dbname[7]}
                    description="eveApp7.db"
                    onPress={() => openDB(7)}
                    onLongPress={() => changeName(7)}
                    onSwipe={() => deleteDB(7)}
                />
                <ListItem
                    title={dbname[8]}
                    description="eveApp8.db"
                    onPress={() => openDB(8)}
                    onLongPress={() => changeName(8)}
                    onSwipe={() => deleteDB(8)}
                />
                <ListItem
                    title={dbname[9]}
                    description="eveApp9.db"
                    onPress={() => openDB(9)}
                    onLongPress={() => changeName(9)}
                    onSwipe={() => deleteDB(9)}
                />
                <Divider />
                <View style={{height: 40}} />
            </ScrollView>
            {/*</React.StrictMode>*/}
        </SafeAreaView>
    );
};

/* 向左滑動 */
const SwipeRight = (progress, translation) => {
    const canHaptic = useRef(true); //可否震動

    //背景動畫
    const styleAnimation = useAnimatedStyle(() => {
        const translateX = interpolate(translation.value, [-120, 0], [-20, 20], 'clamp');
        const rotate = interpolate(translation.value, [-120, 0], [0, 70], 'clamp');

        return {
            marginLeft: 'auto',
            transform: [{translateX: translateX}, {rotate: rotate.toString() + 'deg'}],
        };
    });

    //體感觸摸
    useAnimatedReaction(
        () => translation.value,
        current => {
            if (current > 150 && canHaptic.current === true) {
                runOnJS(ReactNativeHapticFeedback.trigger)('effectTick');
                canHaptic.current = false;
            } else if (current < -150 && canHaptic.current === true) {
                runOnJS(ReactNativeHapticFeedback.trigger)('effectTick');
                canHaptic.current = false;
            } else if (current <= 150 && current >= -150) {
                canHaptic.current = true;
            }
        },
        [canHaptic],
    );

    //背景圖片
    return (
        <View style={{backgroundColor: 'indianred', width: '100%', justifyContent: 'center'}}>
            <Animated.View style={styleAnimation}>
                <FW5Icon name={'trash-alt'} size={40} color={Color.white} />
            </Animated.View>
        </View>
    );
};

/* 列表 */
const ListItem = ({title, description, onSwipe, ...props}) => {
    const {colors} = useTheme();
    const ref = useRef(null);

    /* 確認動作 */
    const swipeOpen = useCallback(
        direction => {
            //移除
            if (direction === 'left') {
                ref.current.close();
                onSwipe();
            }
        },
        [onSwipe],
    );

    return (
        <Swipeable
            ref={ref}
            leftThreshold={150}
            rightThreshold={150}
            renderRightActions={SwipeRight}
            onSwipeableOpen={swipeOpen}
            overshootFriction={20}>
            <List.Item
                style={[style.list, {backgroundColor: colors.background}]}
                title={title ?? '建立新存檔'}
                description={description}
                titleStyle={{fontStyle: title === null ? 'italic' : undefined}}
                {...props}
            />
        </Swipeable>
    );
};

const restartApp = () => {
    ToastAndroid.show('轉換資料庫, 正在重新啟動', ToastAndroid.SHORT);
    RNRestart.Restart();
};

const style = StyleSheet.create({
    list: {
        borderTopWidth: 0.5,
        borderColor: Color.darkColorLight,
    },
});

export {ChangeSave};
