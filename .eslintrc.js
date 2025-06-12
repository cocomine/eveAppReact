module.exports = {
    root: true,
    extends: '@react-native',
    plugins: ['prettier'],
    rules: {
        'prettier/prettier': [
            'error',
            {
                singleQuote: true,
                trailingComma: 'all',
                printWidth: 100,
                tabWidth: 4,
                semi: true,
                endOfLine: 'auto',
            },
        ],
        'react-native/no-inline-styles': 'off',
        'react-native/no-color-literals': 'off',
        'react-native/no-raw-text': 'off',
        'react-native/no-unused-styles': 'warn',
    },
};
