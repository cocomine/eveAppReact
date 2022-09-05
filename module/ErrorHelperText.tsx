import React, {ReactNode} from "react";
import {HelperText} from 'react-native-paper';

/**
 * 輸入欄位錯誤提示文字
 * @param visible 是否可見
 * @param children {@link ReactNode}
 * @constructor
 */
const ErrorHelperText: React.FC<{ visible: boolean, children: ReactNode | ReactNode[] }> = ({visible, children}) => {
    return (
        <HelperText type={'error'} padding={'none'} style={{display: visible ? undefined : 'none'}} visible={visible}>{children}</HelperText>
    )
}

export default ErrorHelperText;