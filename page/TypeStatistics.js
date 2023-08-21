/* 貨櫃尺寸 統計 */
import React, { useEffect, useState } from "react";
import { Dimensions, View } from "react-native";

const screenWidth = Dimensions.get('window').width;

const data = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
        {
            data: [20, 45, 28, 80, 99, 43],
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // optional
            strokeWidth: 2 // optional
        }
    ],
    legend: ['Rainy Days'] // optional
};

const chartConfig = {
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2, // optional, default 3
    barPercentage: 0.5,
    useShadowColorFromDataset: false // optional
};

const TypeStatistics = ({navigation, route}) => {

    let [tooltipPos, setTooltipPos] = useState({x: 0, y: 0, visible: false, value: 0});

    useEffect(() => {
        console.log(route);
    }, [route]);

    return (
        <View style={{flex: 1}}>

        </View>
    );
};

export {TypeStatistics};
