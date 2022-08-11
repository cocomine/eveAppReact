import React from 'react';
import {NavigationContainer} from "@react-navigation/native";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import {Color} from "./module/Color";
import {Home} from "./page/Home";
import {AddRecord} from "./page/AddRecord";
import FWIcon from "react-native-vector-icons/FontAwesome";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {TouchableOpacity, useColorScheme} from "react-native";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* 進入介面 */
function App(){
    /* DarkMode */
    //const isDarkMode = useColorScheme() === 'dark';

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <NavigationContainer>
                <Stack.Navigator screenOptions={{
                    headerStyle: {
                        backgroundColor: Color.primaryColor,
                        height: 44,
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontSize: 14
                    },
                    tabBarLabelStyle:{
                        marginBottom: 8
                    },
                    tabBarStyle:{
                        height: 52,
                    },
                    tabBarIconStyle:{
                        marginBottom: -9
                    },
                }}>
                    <Stack.Screen //主要介面
                        name="Main"
                        component={MainScreen}
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen //增加紀錄
                        name="AddRecord"
                        component={AddRecord}
                        options={{title: '增加紀錄'}}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}

/* 主要介面 */
const MainScreen = () => {
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式

    return (
        <Tab.Navigator screenOptions={({ route }) => ({
            headerStyle: {
                backgroundColor: Color.primaryColor,
                height: 44
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
                fontSize: 14
            },
            tabBarLabelStyle:{
                marginBottom: 8
            },
            tabBarStyle:{
                height: 52,
                backgroundColor: isDarkMode ? Color.darkColor : Color.white
            },
            tabBarIconStyle:{
                marginBottom: -9
            },
            tabBarButton: props => <TouchableOpacity activeOpacity={0.8} {...props} />,
            tabBarIcon: ({focused, color, size}) => {
                let iconName;

                if (route.name === 'Home') {
                    iconName = 'book';
                } else if (route.name === 'Export') {
                    iconName = 'file-pdf-o';
                } else if (route.name === 'Backup') {
                    iconName = 'cloud-upload';
                } else if (route.name === 'Setting') {
                    iconName = 'gear';
                }

                // You can return any component that you like here!
                return <FWIcon name={iconName} size={(size-6)} color={color} />;
            }
        })}>
            <Tab.Screen name="Home" component={Home} options={{ //"紀錄"介面
                headerShown: false,
                title: '紀錄'
            }}/>
            <Tab.Screen name="Export" component={Home} options={{title: '匯出'}}/>
            <Tab.Screen name="Backup" component={Home} options={{title: '備份'}}/>
            <Tab.Screen name="Setting" component={Home} options={{title: '設定'}}/>
        </Tab.Navigator>
    );
}

export default App;
