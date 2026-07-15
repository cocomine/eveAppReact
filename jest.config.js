module.exports = {
    preset: 'react-native',
    setupFilesAfterEnv: ['<rootDir>/jest/setup.js'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
        '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve('react-native/jest/assetFileTransformer'),
    },
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|react-native-.*|@react-native|@react-native-community|@react-navigation)/)',
    ],
};
