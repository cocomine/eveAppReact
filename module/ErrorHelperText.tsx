import React, {ReactNode} from "react";
import {HelperText} from 'react-native-paper';

const ErrorHelperText: React.FC<{ visible: boolean, children: ReactNode | ReactNode[] }> = ({visible, children}) => {
    return (
        <HelperText type={'error'} padding={'none'} style={{display: visible ? undefined : 'none'}} visible={visible}>{children}</HelperText>
    )
}

export default ErrorHelperText;