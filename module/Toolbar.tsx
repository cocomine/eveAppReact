import React from 'react';
import {StyleSheet, View} from "react-native";
import {Color} from "./Color";

/* 頂部toolbar */
const Toolbar: React.FC<{ children?: React.ReactNode | React.ReactNode[] }> = ({children}) => {
    return (<View style={[style.toolBar]}>
        {children}
    </View>);
}
/* toolbar 內部 View */
const ToolBarView: React.FC<{ children?: React.ReactNode | React.ReactNode[] }> = ({children}) => {
    return (<View style={[{flexDirection: "row", alignItems: 'center'}]}>
        {children}
    </View>);
}

/* toolbar style */
const style = StyleSheet.create({
    toolBar: {
        flexDirection: "row",
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        backgroundColor: Color.primaryColor,
        color: Color.white,
        paddingRight: 10,
        paddingLeft: 5,
    },
});

export {Toolbar, ToolBarView};