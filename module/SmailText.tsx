import React from "react";
import {MD2Theme, Text, useTheme} from 'react-native-paper';
import {ColorValue} from 'react-native';

/* 細小文字 */
const SmailText: React.FC<{ color?: string, children: React.ReactNode }> = ({color, children}) => {
    const {colors} = useTheme<MD2Theme>();

    return (
        <Text style={{fontSize: 10, color: (color || colors.text), marginTop: 3}}>{children}</Text>
    );
}

export {SmailText}
