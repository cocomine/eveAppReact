import React, {useEffect} from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {Appbar, Text} from 'react-native-paper';
import {Color} from '../module/Color';

const Export = ({route}) => {
    useEffect(() => {

    }, [route]);
    console.log(route);
    return (
        <SafeAreaView style={{flex: 1}}>
            <Appbar.Header style={{backgroundColor: route.color}}>
                <Appbar.Content title={'匯出'} color={Color.white}/>
            </Appbar.Header>
            <React.StrictMode>
                <View style={{}}>
                    <Text>Export</Text>
                </View>
            </React.StrictMode>
        </SafeAreaView>
    );
};

const style = StyleSheet.create({});

export {Export};