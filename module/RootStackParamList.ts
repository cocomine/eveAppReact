export type RootStackParamList = {
    Calculator: {
        inputID: string;
        pageName: string;
    };
    AddRecord: {
        inputID?: string;
        value?: string;
    };
    Main: {
        showDay?: string;
    };
    EditRecord: {
        inputID?: string;
        value?: string;
        recordID?: number;
    };
};
