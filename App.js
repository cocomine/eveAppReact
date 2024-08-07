import React, {useCallback, useEffect, useState} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AddRecord} from './page/AddRecord';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StatusBar, useColorScheme} from 'react-native';
import {
    DarkTheme as NavigationDarkTheme,
    DefaultTheme as NavigationDefaultTheme,
    NavigationContainer,
    useFocusEffect,
} from '@react-navigation/native';
import {
    Appbar,
    BottomNavigation,
    MD2DarkTheme as PaperDarkTheme,
    MD2LightTheme as PaperDefaultTheme,
    Provider as PaperProvider,
} from 'react-native-paper';
import merge from 'deepmerge';
import {Home} from './page/Home';
import {Color} from './module/Color';
import Calculator from './module/Calculator';
import {EditRecord} from './page/EditRecord';
import {Export} from './page/Export';
import {Setting} from './page/Setting';
import {StartUp} from './page/StartUp';
import {ChangeSave} from './page/ChangeSave';
import {Statistics} from './page/Statistics';
import {Backup} from './page/Backup';
import {Search} from './page/Search';
import {Note} from './page/Note';
import {AddNote} from './page/AddNote';
import codePush from 'react-native-code-push';

const Stack = createNativeStackNavigator();

const CombinedDefaultTheme = merge(PaperDefaultTheme, NavigationDefaultTheme);
let CombinedDarkTheme = merge(PaperDarkTheme, NavigationDarkTheme);
CombinedDarkTheme = {...CombinedDarkTheme, colors: {...CombinedDarkTheme.colors, background: Color.darkColor}};

/* 進入介面 */
function App() {
    /* DarkMode */
    const isDarkMode = useColorScheme() === 'dark';
    let theme = isDarkMode ? CombinedDarkTheme : CombinedDefaultTheme;
    theme = {
        ...theme,
        colors: {
            ...theme.colors,
            primary: Color.primaryColor,
        },
    };

    function CustomNavigationBar({navigation, back, options}) {
        return (
            <Appbar.Header style={{backgroundColor: Color.primaryColor}}>
                {options.headerBackVisible === false ? null : <Appbar.BackAction onPress={navigation.goBack} />}
                <Appbar.Content title={options.title} />
            </Appbar.Header>
        );
    }

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <PaperProvider theme={theme}>
                <NavigationContainer theme={theme}>
                    <Stack.Navigator
                        initialRouteName={'StartUp'}
                        screenOptions={{header: props => <CustomNavigationBar {...props} />}}>
                        <Stack.Group>
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
                            <Stack.Screen //編輯紀錄
                                name="EditRecord"
                                component={EditRecord}
                                options={{title: '編輯紀錄'}}
                            />
                            <Stack.Screen //選擇存檔
                                name="ChangeSave"
                                component={ChangeSave}
                                options={{title: '選擇存檔'}}
                            />
                            <Stack.Screen //備份
                                name="Backup"
                                component={Backup}
                                options={{title: '備份', headerShown: false}}
                            />
                            <Stack.Screen //搜尋
                                name="Search"
                                component={Search}
                                options={{title: '搜尋', headerShown: false}}
                            />
                            <Stack.Screen //備忘錄
                                name="Note"
                                component={Note}
                                options={{title: '備忘錄', headerShown: false}}
                            />
                            <Stack.Screen //備忘錄
                                name="AddNote"
                                component={AddNote}
                                options={{title: '備忘錄', headerShown: false}}
                            />
                        </Stack.Group>
                        <Stack.Screen //啟動介面
                            name="StartUp"
                            component={StartUp}
                            options={{headerShown: false}}
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
const MainScreen = ({navigation}) => {
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        {key: 'Home', title: '紀錄', focusedIcon: 'book', color: Color.primaryColor},
        {key: 'Export', title: '匯出', focusedIcon: 'export-variant', color: Color.orange},
        {key: 'Statistics', title: '統計', focusedIcon: 'chart-bar', color: Color.success},
        {key: 'Setting', title: '設定', focusedIcon: 'cog', color: Color.indigo},
    ]);

    const renderScene = BottomNavigation.SceneMap({
        Home: Home,
        Export: Export,
        Statistics: Statistics,
        Setting: Setting,
    });

    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle('light-content');
            StatusBar.setBackgroundColor(routes[index].color, true);
        }, [index, routes]),
    );

    useEffect(() => {
        StatusBar.setBarStyle('light-content');
        StatusBar.setBackgroundColor(routes[index].color, true);
    }, [index, routes]);

    const indexChange = index => {
        setIndex(index);
    };

    return (
        <BottomNavigation
            navigationState={{index, routes}}
            onIndexChange={indexChange}
            renderScene={renderScene}
            sceneAnimationEnabled={true}
            sceneAnimationType={'shifting'}
            style={{flex: 1}}
        />
    );
};

// code push
let codePushOptions = { updateDialog: {
        title: "有新版本",
        optionalUpdateMessage: "有新版本，是否更新?",
        optionalIgnoreButtonLabel: "忽略",
        optionalInstallButtonLabel: "安裝",
        optionalUpdateTitle: "有新版本",
        appendReleaseDescription: true,
        descriptionPrefix: "\n\n更新內容：\n",
        mandatoryUpdateMessage: "有新版本，請更新",
        mandatoryContinueButtonLabel: "更新",
    }, installMode: codePush.InstallMode.ON_NEXT_RESTART };
App = codePush(codePushOptions)(App);

export default App;
