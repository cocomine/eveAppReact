/* 直接選擇月份 */
import React, {useCallback, useEffect, useState} from "react";
import {IconButton, Text, useTheme} from "react-native-paper";
import moment from "moment/moment";
import ReAnimated, {FadeInUp, FadeOutUp} from "react-native-reanimated";
import {StyleSheet, TouchableWithoutFeedback, View} from "react-native";
import {Color} from "./Color";

const DateSelect: React.FC<{
    visibility?: boolean,
    onSelect?: (date: Date) => void,
    value?: Date,
    onDismiss?: () => void
}> = ({
          visibility = false,
          onSelect = () => null,
          value = new Date(),
          onDismiss = () => null
      }) => {
    const [date, setDate] = useState(value);
    const {colors} = useTheme();
    const correctMonth = date.getMonth();

    /* 修改預設月份 */
    useEffect(() => setDate(value), [value]);

    /* 選擇顯示年份 */
    const NextYear = () => {
        let tmp = moment(date);
        tmp.add(1, 'y').endOf('month');

        setDate(tmp.toDate());
    };
    const LastYear = () => {
        let tmp = moment(date);
        tmp.subtract(1, 'y').endOf('month');

        setDate(tmp.toDate());
    };

    /* 當前月份 */
    const today = useCallback(() => {
        onDismiss();
        onSelect(new Date());
    }, [onDismiss, onSelect]);

    /* 月份選擇 */
    const setMonth = (month: number) => {
        let tmp = moment(date);
        tmp.month(month).endOf('month');

        onDismiss();
        onSelect(tmp.toDate());
    };

    return (
        visibility ?
            <ReAnimated.View style={[style.dateSelect, {backgroundColor: colors.background}]} entering={FadeInUp} exiting={FadeOutUp}>
                <View style={[style.row, {height: 45, paddingHorizontal: 10, backgroundColor: '#4596ff'}]}>
                    <Text>選擇日期</Text>
                    <View style={style.row}>
                        <IconButton icon={'calendar-end'} iconColor={colors.text} onPress={today}/>
                        <IconButton icon={'close'} iconColor={colors.text} onPress={onDismiss}/>
                    </View>
                </View>
                <View style={style.row}>
                    <IconButton icon={'chevron-left'} iconColor={colors.text} onPress={LastYear}/>
                    <Text>{moment(date).format('yyyy')}</Text>
                    <IconButton icon={'chevron-right'} iconColor={colors.text} onPress={NextYear}/>
                </View>
                <View style={{flex: 1}}>
                    <View style={[style.row, {flex: 1}]}>
                        <TouchableWithoutFeedback onPress={() => setMonth(0)}>
                            <View style={style.button}><Text style={{color: correctMonth === 0 ? Color.primaryColor : colors.text}}>1月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(1)}>
                            <View style={style.button}><Text style={{color: correctMonth === 1 ? Color.primaryColor : colors.text}}>2月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(2)}>
                            <View style={style.button}><Text style={{color: correctMonth === 2 ? Color.primaryColor : colors.text}}>3月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(3)}>
                            <View style={style.button}><Text style={{color: correctMonth === 3 ? Color.primaryColor : colors.text}}>4月</Text></View>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={[style.row, {flex: 1}]}>
                        <TouchableWithoutFeedback onPress={() => setMonth(4)}>
                            <View style={style.button}><Text style={{color: correctMonth === 4 ? Color.primaryColor : colors.text}}>5月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(5)}>
                            <View style={style.button}><Text style={{color: correctMonth === 5 ? Color.primaryColor : colors.text}}>6月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(6)}>
                            <View style={style.button}><Text style={{color: correctMonth === 6 ? Color.primaryColor : colors.text}}>7月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(7)}>
                            <View style={style.button}><Text style={{color: correctMonth === 7 ? Color.primaryColor : colors.text}}>8月</Text></View>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={[style.row, {flex: 1}]}>
                        <TouchableWithoutFeedback onPress={() => setMonth(8)}>
                            <View style={style.button}><Text style={{color: correctMonth === 8 ? Color.primaryColor : colors.text}}>9月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(9)}>
                            <View style={style.button}><Text style={{color: correctMonth === 9 ? Color.primaryColor : colors.text}}>10月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(11)}>
                            <View style={style.button}><Text style={{color: correctMonth === 10 ? Color.primaryColor : colors.text}}>11月</Text></View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => setMonth(11)}>
                            <View style={style.button}><Text style={{color: correctMonth === 11 ? Color.primaryColor : colors.text}}>12月</Text></View>
                        </TouchableWithoutFeedback>
                    </View>
                </View>
            </ReAnimated.View>
            : null
    );
};

export {DateSelect}

const style = StyleSheet.create({
    dateSelect: {
        position: 'absolute',
        top: '100%',
        left: 10,
        right: 10,
        borderRadius: 10,
        zIndex: 5,
        elevation: 5,
        height: 280,
        overflow: 'hidden',
    },
    button: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    row: {
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row'
    },
})