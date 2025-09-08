import React from 'react';
import {Dimensions, View} from 'react-native';
import {Appbar, Provider as PaperProvider, useTheme} from 'react-native-paper';
import {Color} from '../module/Color';
import Sound from 'react-native-sound';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import ExportPDF from './ExportPDF';
import ExportExcel from './ExportExcel';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {RouteParamsContext} from '../module/RouteParamsContext';

const TAB = createMaterialTopTabNavigator();

/* Done sound */
const SOUND = new Sound('done.mp3', Sound.MAIN_BUNDLE, error => {
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

    /** @type {RouteProp<RootStackParamList, 'Main'>} **/
    const rn_route = useRoute();
    const insets = useSafeAreaInsets();

    return (
        <PaperProvider theme={theme}>
            <View style={{flex: 1}}>
                <Appbar
                    style={{backgroundColor: route.color, height: 50 + insets.top}}
                    safeAreaInsets={{top: insets.top}}>
                    <Appbar.Content title={route.title} color={Color.white} />
                </Appbar>
                <RouteParamsContext value={rn_route.params}>
                    <TAB.Navigator
                        screenOptions={{
                            tabBarStyle: {backgroundColor: route.color},
                            tabBarLabelStyle: {color: Color.white},
                            tabBarIndicatorStyle: {backgroundColor: Color.white},
                            tabBarPressColor: Color.white,
                        }}
                        initialLayout={{width: Dimensions.get('window').width}}>
                        <TAB.Screen name="ExportPDF" component={ExportPDF} options={{title: '匯出 PDF'}} />
                        <TAB.Screen name="ExportExcel" component={ExportExcel} options={{title: '匯出 Excel'}} />
                    </TAB.Navigator>
                </RouteParamsContext>
            </View>
        </PaperProvider>
    );
};

export {Export, SOUND as sound};
