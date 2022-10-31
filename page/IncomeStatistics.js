/* 收入 統計 */
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';

const IncomeStatistics = ({navigation, route}) => {
    useEffect(() => {
        console.log(route);
    }, [route]);

    return (
        <View style={{flex: 1}}>
            <Text>ada</Text>
        </View>
    );
};

export {IncomeStatistics};