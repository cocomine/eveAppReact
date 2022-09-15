import React, {useCallback, useRef} from 'react';
import {Animated, SafeAreaView, ScrollView, StatusBar, StyleSheet, View} from 'react-native';
import {Caption, Divider, List, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {Swipeable} from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import FW5Icon from 'react-native-vector-icons/FontAwesome5';

const ChangeSave = () => {
    return (
        <SafeAreaView style={{flex: 1}}>
            <StatusBar backgroundColor={Color.primaryColor} barStyle={'light-content'} animated={true}/>
            <React.StrictMode>
                <ScrollView>
                    <View style={{paddingHorizontal: 10}}>
                        <Caption>不同存檔之間的數據及設定均是獨立並不通用, 最多只能開十個存檔</Caption>
                        <Caption>(名稱只作用識別用途, 不會更改真實檔案名稱亦不會一起備份)</Caption>
                        <Caption>單擊-開啟, 雙擊-改名, 滑動-刪除</Caption>
                    </View>
                    <ListItem title="未命名" description="eveApp.db" fileName="eveApp.db"/>
                    <ListItem title="建立新存檔" description="eveApp1.db" fileName="eveApp1.db"/>
                    <ListItem title="建立新存檔" description="eveApp2.db" fileName="eveApp2.db"/>
                    <ListItem title="建立新存檔" description="eveApp3.db" fileName="eveApp3.db"/>
                    <ListItem title="建立新存檔" description="eveApp4.db" fileName="eveApp4.db"/>
                    <ListItem title="建立新存檔" description="eveApp5.db" fileName="eveApp5.db"/>
                    <ListItem title="建立新存檔" description="eveApp6.db" fileName="eveApp6.db"/>
                    <ListItem title="建立新存檔" description="eveApp7.db" fileName="eveApp7.db"/>
                    <ListItem title="建立新存檔" description="eveApp8.db" fileName="eveApp8.db"/>
                    <ListItem title="建立新存檔" description="eveApp9.db" fileName="eveApp9.db"/>
                    <Divider/>
                </ScrollView>
            </React.StrictMode>
        </SafeAreaView>
    );
};

const ListItem = ({title, description, fileName}) => {
    const canHaptic = useRef(true); //可否震動
    const {colors} = useTheme();
    const ref = useRef(null);

    /* 向左滑動 */
    const swipeRight = useCallback((progress, dragX) => {
        //背景動畫
        const translateX = dragX.interpolate({
            inputRange: [-120, 0],
            outputRange: [-20, 20],
            extrapolate: 'clamp'
        });
        const rotate = dragX.interpolate({
            inputRange: [-120, 0],
            outputRange: ['0deg', '70deg'],
            extrapolate: 'clamp'
        });

        //體感觸摸
        dragX.addListener(({value}) => {
            if(value < (120 * -1)){
                if(canHaptic.current === true){
                    ReactNativeHapticFeedback.trigger('effectTick');
                    canHaptic.current = false;
                }
            }else{
                canHaptic.current = true;
            }
        });

        //背景圖片
        return (
            <Animated.View style={{backgroundColor: 'indianred', width: '100%', justifyContent: 'center'}}>
                <Animated.View style={{
                    marginLeft: 'auto',
                    transform: [{translateX}, {rotate}]
                }}>
                    <FW5Icon name={'trash-alt'} size={40} color={Color.white}/>
                </Animated.View>
            </Animated.View>
        );
    }, []);

    /* 確認動作 */
    const swipeOpen = useCallback((direction) => {
        console.log(direction);
        //移除
        if(direction === 'right'){
            ref.current.close();
        }
    }, []);

    return (
        <Swipeable ref={ref} leftThreshold={120} rightThreshold={120} renderRightActions={swipeRight} onSwipeableOpen={swipeOpen} overshootFriction={8}>
            <List.Item style={[style.list,
                {backgroundColor: colors.background}]} title={title} description={description} onPress={() => null} onLongPress={() => null}/>
        </Swipeable>
    );
};

const style = StyleSheet.create({
    list: {
        borderTopWidth: 0.5,
        borderColor: Color.darkColorLight
    }
});

export {ChangeSave};