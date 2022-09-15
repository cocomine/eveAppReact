import React from 'react';
import {Appbar, Provider as PaperProvider, Subheading, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {SafeAreaView, View} from 'react-native';

const Statistics = ({route}) => {
    let theme = useTheme();
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: route.color
        }
    };

    return (
        <PaperProvider theme={theme}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header style={{backgroundColor: route.color}}>
                    <Appbar.Content title={route.title} color={Color.white}/>
                </Appbar.Header>
                <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
                    <Subheading>功能尚未開放... (┬┬﹏┬┬)</Subheading>
                </View>
            </SafeAreaView>
        </PaperProvider>
    );
};

export {Statistics};