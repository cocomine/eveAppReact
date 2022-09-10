import React, {useEffect, useState} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AddRecord} from './page/AddRecord';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StatusBar, useColorScheme} from 'react-native';
import {DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, NavigationContainer} from '@react-navigation/native';
import {
    Appbar,
    BottomNavigation,
    MD2DarkTheme as PaperDarkTheme,
    MD2LightTheme as PaperDefaultTheme,
    Provider as PaperProvider
} from 'react-native-paper';
import merge from 'deepmerge';
import {Home} from './page/Home';
import {Color} from './module/Color';
import Calculator from './module/Calculator';
import {EditRecord} from './page/EditRecord';
import {Export} from './page/Export';

const Stack = createNativeStackNavigator();

const CombinedDefaultTheme = merge(PaperDefaultTheme, NavigationDefaultTheme);
const CombinedDarkTheme = merge(PaperDarkTheme, NavigationDarkTheme);

/* 進入介面 */
function App(){
    /* DarkMode */
    const isDarkMode = useColorScheme() === 'dark';
    let theme = isDarkMode ? CombinedDarkTheme : CombinedDefaultTheme;
    theme = {
        ...theme,
        dark: false,
        colors: {
            ...theme.colors,
            primary: Color.primaryColor,
        }
    }

    function CustomNavigationBar({navigation, back, options}){
        return (
            <Appbar.Header>
                {back ? <Appbar.BackAction onPress={navigation.goBack}/> : null}
                <Appbar.Content title={options.title}/>
            </Appbar.Header>
        );
    }

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <PaperProvider theme={theme}>
                <NavigationContainer theme={theme}>
                    <Stack.Navigator screenOptions={{header: (props) => <CustomNavigationBar {...props} />}}>
                        <Stack.Screen //主要介面
                            name="Main"
                            component={MainScreen}
                            options={{headerShown: false}}
                        />
                        <Stack.Screen //增加紀錄
                            name="AddRecord"
                            component={AddRecord}
                            options={{title: '增加紀錄'}}
                        />
                        <Stack.Screen //增加紀錄
                            name="EditRecord"
                            component={EditRecord}
                            options={{title: '編輯紀錄'}}
                        />
                        <Stack.Group screenOptions={{presentation: 'modal'}}>
                            <Stack.Screen //計算機
                                name="calculator"
                                component={Calculator}
                                options={{headerShown: false}}
                            />
                        </Stack.Group>
                    </Stack.Navigator>
                </NavigationContainer>
            </PaperProvider>
        </GestureHandlerRootView>
    );
}

/* 主要介面 */
const MainScreen = () => {
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        {key: 'Home', title: '紀錄', focusedIcon: 'book', color: Color.primaryColor},
        {key: 'Export', title: '匯出', focusedIcon: 'export-variant', color: Color.orange},
        {key: 'Statistics', title: '統計', focusedIcon: 'chart-bar', color: Color.success},
        {key: 'Setting', title: '設定', focusedIcon: 'cog', color: Color.indigo}
    ]);

    const renderScene = BottomNavigation.SceneMap({
        Home: Home,
        Export: Export,
        Statistics: Home,
        Setting: Home
    });

    useEffect(() => {
        StatusBar.setBackgroundColor(routes[index].color, true);
    }, []);

    const indexChange = (index) => {
        setIndex(index);
        StatusBar.setBackgroundColor(routes[index].color, true);
    };

    return (
        <BottomNavigation
            navigationState={{index, routes}}
            onIndexChange={indexChange}
            renderScene={renderScene}
            sceneAnimationEnabled={true}
            sceneAnimationType={'shifting'}
        />
    );
}

export default App;
