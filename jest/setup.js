require('react-native-gesture-handler/jestSetup');

require('react-native-reanimated').setUpTests();

jest.useFakeTimers();

jest.mock('react-native-haptic-feedback', () => ({
    trigger: jest.fn(),
}));

jest.mock('react-native-text-input-mask', () => {
    const React = require('react');
    const { TextInput } = require('react-native');

    return {
        __esModule: true,
        default: React.forwardRef((props, ref) => React.createElement(TextInput, { ...props, ref })),
        mask: jest.fn(async (_format, value) => value),
        unmask: jest.fn(async (_format, value) => value),
        setMask: jest.fn(),
    };
});

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockCreateIcon = () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.forwardRef((props, ref) => React.createElement(Text, { ...props, ref }));
};

jest.mock('@react-native-vector-icons/ant-design', () => ({
    __esModule: true,
    default: mockCreateIcon(),
}));

jest.mock('@react-native-vector-icons/fontawesome5', () => ({
    __esModule: true,
    default: mockCreateIcon(),
}));

jest.mock('@react-native-vector-icons/material-design-icons', () => ({
    __esModule: true,
    default: mockCreateIcon(),
}));

jest.mock('react-native-sound', () => {
    const Sound = jest.fn().mockImplementation((_file, _basePath, callback) => {
        callback?.(null);
        return {
            play: jest.fn(),
            release: jest.fn(),
            setVolume: jest.fn(),
            stop: jest.fn(),
        };
    });

    Sound.MAIN_BUNDLE = 'MAIN_BUNDLE';
    return Sound;
});

jest.mock('react-native-fs', () => ({
    CachesDirectoryPath: '/tmp',
    DocumentDirectoryPath: '/tmp',
    MainBundlePath: '/tmp',
    copyFile: jest.fn(() => Promise.resolve()),
    exists: jest.fn(() => Promise.resolve(false)),
    mkdir: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('')),
    unlink: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve()),
    downloadFile: jest.fn(() => ({ promise: Promise.resolve({ statusCode: 200 }) })),
}));

jest.mock('react-native-mail', () => ({
    mail: jest.fn((_options, callback) => callback?.()),
}));

jest.mock('react-native-file-viewer', () => ({
    open: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-share', () => ({
    Social: {},
    open: jest.fn(() => Promise.resolve({ success: true })),
    shareSingle: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('react-native-html-to-pdf', () => ({
    convert: jest.fn(() => Promise.resolve({ filePath: '/tmp/test.pdf' })),
}));

jest.mock('@cocomine/react-native-print', () => ({
    __esModule: true,
    default: {
        print: jest.fn(() => Promise.resolve()),
    },
}));

jest.mock('@react-native-picker/picker', () => {
    const React = require('react');
    const { View } = require('react-native');
    const Picker = ({ children, ...props }) => React.createElement(View, props, children);
    Picker.Item = props => React.createElement(View, props);
    return { Picker };
});

jest.mock('react-native-prompt-android', () => jest.fn());

jest.mock('react-native-restart', () => ({
    Restart: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
    launchCamera: jest.fn(),
    launchImageLibrary: jest.fn(),
}));

jest.mock('sp-react-native-in-app-updates', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            checkNeedsUpdate: jest.fn(() => Promise.resolve({ shouldUpdate: false })),
            startUpdate: jest.fn(() => Promise.resolve()),
        })),
        IAUUpdateKind: {
            FLEXIBLE: 0,
            IMMEDIATE: 1,
        },
    };
});

jest.mock('@notifee/react-native', () => ({
    __esModule: true,
    default: {
        createChannel: jest.fn(() => Promise.resolve('default')),
        displayNotification: jest.fn(() => Promise.resolve()),
        registerForegroundService: jest.fn(),
        requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
        stopForegroundService: jest.fn(() => Promise.resolve()),
    },
    AndroidImportance: {
        HIGH: 4,
        MIN: 1,
    },
    AuthorizationStatus: {
        AUTHORIZED: 1,
        DENIED: 0,
        PROVISIONAL: 2,
    },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
        configure: jest.fn(),
        getCurrentUser: jest.fn(() => null),
        getTokens: jest.fn(() => Promise.resolve({ accessToken: '' })),
        hasPlayServices: jest.fn(() => Promise.resolve(true)),
        hasPreviousSignIn: jest.fn(() => false),
        signIn: jest.fn(() => Promise.resolve({ type: 'success' })),
        signInSilently: jest.fn(() => Promise.resolve(null)),
        signOut: jest.fn(() => Promise.resolve()),
    },
    isErrorWithCode: jest.fn(() => false),
    isSuccessResponse: jest.fn(response => response?.type === 'success'),
    statusCodes: {},
}));

jest.mock('@robinbobin/react-native-google-drive-api-wrapper', () => ({
    GDrive: jest.fn().mockImplementation(() => ({
        accessToken: '',
        files: {
            copy: jest.fn(() => Promise.resolve()),
            createFileMultipart: jest.fn(() => Promise.resolve()),
            delete: jest.fn(() => Promise.resolve()),
            get: jest.fn(() => Promise.resolve({})),
            list: jest.fn(() => Promise.resolve({ files: [] })),
        },
    })),
    MimeTypes: {},
}));

jest.mock('react-native-sqlite-storage', () => {
    const rows = {
        length: 1,
        item: jest.fn(() => ({ Target: 'database_version', value: '1.5.7' })),
    };
    const transaction = jest.fn(async callback =>
        callback({
            executeSql: jest.fn(() => Promise.resolve([{}, { rows }])),
        }),
    );
    const database = {
        close: jest.fn(() => Promise.resolve()),
        readTransaction: transaction,
        transaction,
    };

    return {
        __esModule: true,
        default: {
            enablePromise: jest.fn(),
            openDatabase: jest.fn(() => Promise.resolve(database)),
        },
    };
});

jest.mock('lottie-react-native', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: props => React.createElement(View, props),
    };
});
