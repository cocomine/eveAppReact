import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

export const Exchange: React.FC<{ open: boolean; onClose: Function }> = ({ open, onClose }) => {
    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!open) return null;

    return <></>;
};

const STYLE = StyleSheet.create({
    _: {},
});
