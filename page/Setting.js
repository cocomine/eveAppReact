import React from 'react';
import {Appbar, Provider as PaperProvider, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import {SafeAreaView} from 'react-native';

const Setting = ({route}) => {
    let theme = useTheme();
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: Color.indigo
        }
    };


    return (
        <PaperProvider theme={theme}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header style={{backgroundColor: route.color}}>
                    <Appbar.Content title={route.title} color={Color.white}/>
                </Appbar.Header>
            </SafeAreaView>
        </PaperProvider>
    );
};

export {Setting};