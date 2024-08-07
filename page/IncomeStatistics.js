/* 收入 統計 */
import React, { useEffect } from "react";
import { View } from "react-native";

const IncomeStatistics = ({navigation, route}) => {
    useEffect(() => {
        console.log(route);
    }, [route]);

    return (
        <View style={{flex: 1}}>

        </View>
    );
};

export {IncomeStatistics};
