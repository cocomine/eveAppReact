export type IRootStackParamList = {
    Calculator: {
        inputID?: string;
        pageName?: string;
    };
    AddRecord: {
        inputID?: string;
        value?: string;
    };
    Main: {
        settingForceRefreshAlert?: number;
        showDay?: string;
    };
    EditRecord: {
        inputID?: string;
        value?: string;
        recordID?: number;
    };
    AddNote: {
        id?: number;
    };
    NotePage: {
        id?: number;
        showDay?: string;
    };
};
