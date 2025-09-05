import React from 'react';
import {Dimensions, View} from 'react-native';
import {Appbar, Provider as PaperProvider, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import Sound from 'react-native-sound';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import ExportPDF from './ExportPDF';
import ExportExcel from './ExportExcel';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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

    const insets = useSafeAreaInsets();

    return (
        <PaperProvider theme={theme}>
            <View style={{flex: 1}}>
                <Appbar style={{backgroundColor: route.color, height: 'auto'}} safeAreaInsets={{top: insets.top}}>
                    <Appbar.Content title={route.title} color={Color.white} />
                </Appbar>
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
            </View>
        </PaperProvider>
    );
};

export {Export, sound};
