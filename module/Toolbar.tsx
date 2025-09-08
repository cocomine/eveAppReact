import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {Color} from './Color';

/* 頂部toolbar */
const Toolbar: React.FC<{
    containerStyle?: ViewStyle;
    children?: React.ReactNode | React.ReactNode[];
}> = ({containerStyle, children}) => {
    return <View style={[STYLE.toolBar, containerStyle]}>{children}</View>;
};
/* toolbar 內部 View */
const ToolBarView: React.FC<{style?: ViewStyle; children?: React.ReactNode | React.ReactNode[]}> = ({
    style,
    children,
}) => {
    return <View style={[style, {flexDirection: 'row', alignItems: 'center'}]}>{children}</View>;
};

/* toolbar style */
const STYLE = StyleSheet.create({
    toolBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 55,
        backgroundColor: Color.primaryColor,
        color: Color.white,
        paddingRight: 10,
        paddingLeft: 5,
    },
});

export {Toolbar, ToolBarView};
