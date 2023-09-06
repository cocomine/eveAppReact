import React from 'react';
import {Dimensions, SafeAreaView} from 'react-native';
import {Appbar, Provider as PaperProvider, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import Sound from 'react-native-sound';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import ExportPDF from './ExportPDF';
import ExportExcel from './ExportExcel';

const Tab = createMaterialTopTabNavigator();

/* Done sound */
const sound = new Sound('done.mp3', Sound.MAIN_BUNDLE, error => {
    if (error) {
        console.log('failed to load the sound', error);
    }
});

const Export = ({route}) => {
    let theme = useTheme();
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: route.color,
        },
    };

    return (
        <PaperProvider theme={theme}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header style={{backgroundColor: route.color}}>
                    <Appbar.Content title={route.title} color={Color.white} />
                </Appbar.Header>
                <Tab.Navigator
                    screenOptions={{
                        tabBarStyle: {backgroundColor: route.color},
                        tabBarLabelStyle: {color: Color.white},
                        tabBarIndicatorStyle: {backgroundColor: Color.white},
                        tabBarPressColor: Color.white,
                    }}
                    initialLayout={{width: Dimensions.get('window').width}}>
                    <Tab.Screen
                        name="ExportPDF"
                        component={ExportPDF}
                        options={{title: '匯出 PDF'}}
                        initialParams={{theme}}
                    />
                    <Tab.Screen
                        name="ExportExcel"
                        component={ExportExcel}
                        options={{title: '匯出 Excel'}}
                        initialParams={{theme}}
                    />
                </Tab.Navigator>
            </SafeAreaView>
        </PaperProvider>
    );
};

export {Export, sound};
