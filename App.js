import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AddRecord} from './page/AddRecord';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useColorScheme} from 'react-native';
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
    const [index, setIndex] = React.useState(0);
    const [routes] = React.useState([
        {key: 'Home', title: '紀錄', focusedIcon: 'book', color: Color.primaryColor},
        {key: 'Export', title: '匯出', focusedIcon: 'export-variant', color: Color.orange},
        {key: 'Backup', title: '備份', focusedIcon: 'cloud-upload', color: Color.success},
        {key: 'Setting', title: '設定', focusedIcon: 'cog', color: Color.indigo}
    ]);

    const renderScene = BottomNavigation.SceneMap({
        Home: Home,
        Export: Home,
        Backup: Home,
        Setting: Home,
    });

    return (
        <BottomNavigation
            navigationState={{index, routes}}
            onIndexChange={setIndex}
            renderScene={renderScene}
        />
    );
}

export default App;
