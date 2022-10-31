/* 貨櫃尺寸 統計 */
import React, {useEffect, useState} from 'react';
import {Dimensions, View} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import Svg, {Rect, Text as TextSVG} from 'react-native-svg';

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
            <LineChart
                data={data}
                width={screenWidth}
                height={256}
                verticalLabelRotation={30}
                chartConfig={chartConfig}
                bezier
                decorator={() => {
                    return tooltipPos.visible ? <View>
                        <Svg>
                            <Rect x={tooltipPos.x - 15} y={tooltipPos.y + 10} width="40" height="30" fill="black"/>
                            <TextSVG
                                x={tooltipPos.x + 5}
                                y={tooltipPos.y + 30}
                                fill="white"
                                fontSize="16"
                                fontWeight="bold"
                                textAnchor="middle">
                                {tooltipPos.value}
                            </TextSVG>
                        </Svg>
                    </View> : null;
                }}
                onDataPointClick={(data) => {
                    let isSamePoint = (tooltipPos.x === data.x && tooltipPos.y === data.y);

                    isSamePoint ? setTooltipPos((previousState) => {
                            return {
                                ...previousState,
                                value: data.value,
                                visible: !previousState.visible
                            };
                        }) :
                        setTooltipPos({x: data.x, value: data.value, y: data.y, visible: true});

                }}
            />
        </View>
    );
};

export {TypeStatistics};