import React from "react";
import {Text, useTheme} from "react-native-paper";

/* 細小文字 */
const SmailText: React.FC<{ color?: string | number, children: React.ReactNode }> = ({color, children}) => {
    const {colors} = useTheme();

    return (
        <Text style={{fontSize: 10, color: color || colors.text, marginTop: 3}}>{children}</Text>
    );
}

export {SmailText}