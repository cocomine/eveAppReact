import React from 'react';
import {Image, Linking, SafeAreaView, StatusBar, StyleSheet, useColorScheme, View} from 'react-native';
import {Color} from '../module/Color';
import {Appbar, Button, Headline, Switch, Text, Title, useTheme} from 'react-native-paper';
import {RadioButton, RadioGroup} from '../module/RadioButton';

const Backup = ({navigation}) => {
    const {colors} = useTheme();
    const isDarkMode = useColorScheme() === 'dark'; //是否黑暗模式
    const BG_color = isDarkMode ? Color.darkBlock : Color.white;

    return (
        <SafeAreaView style={{flex: 1}}>
            <StatusBar backgroundColor={Color.primaryColor} barStyle={'light-content'} animated={true}/>
            <Appbar.Header style={{backgroundColor: Color.primaryColor}}>
                <Appbar.BackAction onPress={navigation.goBack}/>
                <Appbar.Content title={'備份'} color={Color.white}/>
                <Appbar.Action icon={'link-variant-off'} onPress={() => {}} disabled={true}/>
            </Appbar.Header>
            <View style={{flex: 1, justifyContent: 'space-between'}}>
                <View>
                    <View style={[style.backup, {backgroundColor: BG_color}]}>
                        <View style={style.logo}>
                            <Headline>Google雲端備份</Headline>
                            <Image source={require('../resource/google-drive-logo2.png')} style={{
                                width: 141.91,
                                height: 38.67
                            }} resizeMode={'contain'}/>
                        </View>
                        <Text>你可以手動將資料備份至google雲端硬碟。你可以隨時從google雲端硬碟中恢復資料。</Text>
                        <View style={[style.detail, {backgroundColor: colors.background}]}>
                            <View style={style.row}>
                                <Text style={{flex: 1 / 3}}>最新備份:</Text>
                                <Text style={{flex: 1, color: Color.blue}} ellipsizeMode={'tail'} numberOfLines={1}>xxxxxxxxxxxxxxxxxxxxx</Text>
                            </View>
                            <View style={style.row}>
                                <Text style={{flex: 1 / 3}}>URL:</Text>
                                <Text style={{flex: 1, textDecorationLine: 'underline', color: Color.green}} ellipsizeMode={'tail'} numberOfLines={1}
                                      onPress={() => Linking.openURL('https://drive.google.com')}>https://drive.google.com
                                </Text>
                            </View>
                            <View style={style.row}>
                                <Text style={{flex: 1 / 3}}>Email:</Text>
                                <Text style={{flex: 1}} ellipsizeMode={'tail'} numberOfLines={1}>xxxxxxxxxxxxxxxxxxxxxxxx</Text>
                            </View>
                        </View>
                    </View>
                    <View style={[style.backup, {backgroundColor: BG_color, display: undefined}]}>
                        <View style={style.logo}>
                            <Title>自動備份:</Title>
                            <Switch value={true} color={Color.primaryColor} onValueChange={() => null}/>
                        </View>
                        <RadioGroup containerStyle={{
                            justifyContent: 'space-between',
                            width: '100%',
                            paddingHorizontal: 20
                        }} onPress={(value) => null}>
                            <RadioButton value={'Day'} label={'每日'} color={Color.primaryColor} selected={false}/>
                            <RadioButton value={'Week'} label={'每週'} color={Color.primaryColor} selected={false}/>
                            <RadioButton value={'Month'} label={'每月'} color={Color.primaryColor} selected={true}/>
                        </RadioGroup>
                    </View>
                </View>
                <View style={[style.button, {backgroundColor: BG_color}]}>
                    <View style={{display: undefined}}>
                        <Button mode={'contained'} buttonColor={Color.green} icon={'link-variant'}>連接</Button>
                    </View>
                    <View style={[style.row, {display: undefined}]}>
                        <Button mode={'outlined'} style={{flex: 1, marginRight: 5}} icon={'backup-restore'}>恢復</Button>
                        <Button mode={'contained'} style={{flex: 1}} icon={'cloud-upload'}>備份</Button>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

const style = StyleSheet.create({
    backup: {
        padding: 10, borderColor: Color.darkColorLight, borderBottomWidth: 0.7
    },
    logo: {
        flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10
    },
    detail: {
        margin: 10,
        paddingVertical: 8,
        paddingHorizontal: 5
    },
    row: {
        flexDirection: 'row'
    },
    button: {
        padding: 10,
        borderColor: Color.darkColorLight,
        borderTopWidth: 0.7
    }
});
export {Backup};