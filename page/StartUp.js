import React, {useEffect} from 'react';
import {SafeAreaView, StatusBar, useColorScheme, View} from 'react-native';
import {Headline, useTheme} from 'react-native-paper';
import {openDB} from '../module/SQLite';
import Lottie from 'lottie-react-native';

const StartUp = ({navigation}) => {
    const {colors} = useTheme();
    const isDarkMode = useColorScheme() === 'dark';

    useEffect(() => {
        openDB().then(() => {
            setTimeout(() => {
                navigation.reset({index: 0, routes: [{name: 'Main'}]});
            }, 2500);
        });
    }, []);

    return (
        <SafeAreaView style={{flex: 1}}>
            <StatusBar backgroundColor={colors.background} barStyle={isDarkMode ? 'light-content' : 'dark-content'} animated={true}/>
            <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
                <Lottie source={require('../resource/Cargo.json')} autoPlay={true} loop={false} style={{width: 200, height: 200}}/>
                <Headline style={{paddingTop: 40}}>運輸紀錄</Headline>
            </View>
        </SafeAreaView>
    );
};

export {StartUp};