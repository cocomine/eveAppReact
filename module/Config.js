/**
 * Configuration Helper
 * 管理環境變量和配置
 */

// 默認API密鑰 - 僅用於開發環境
// 生產環境應從環境變量或安全配置文件讀取
const DEFAULT_API_KEY = '513ff6825b484fa2a9d38df074986a5d';

/**
 * 獲取匯率API配置
 * @returns {{apiKey: string, apiUrl: string}}
 */
const getExchangeRateConfig = () => {
    // 優先使用環境變量（如果使用 react-native-config）
    // const apiKey = Config.EXCHANGE_RATE_API_KEY || DEFAULT_API_KEY;
    // const apiUrl = Config.EXCHANGE_RATE_API_URL || 'https://exchange-rates.abstractapi.com/v1/live/';

    // 目前使用默認值
    // TODO: 實施 react-native-config 以支持環境變量
    const apiKey = DEFAULT_API_KEY;
    const apiUrl = 'https://exchange-rates.abstractapi.com/v1/live/';

    return {apiKey, apiUrl};
};

/**
 * 構建匯率API URL
 * @param {string} base - 基礎貨幣
 * @param {string} target - 目標貨幣
 * @returns {string} - 完整的API URL
 */
const buildExchangeRateUrl = (base = 'HKD', target = 'CNY') => {
    const {apiKey, apiUrl} = getExchangeRateConfig();
    return `${apiUrl}?api_key=${apiKey}&base=${base}&target=${target}`;
};

// CommonJS export for Node.js compatibility
module.exports = {
    getExchangeRateConfig,
    buildExchangeRateUrl,
};


