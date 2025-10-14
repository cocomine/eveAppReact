# 安全性配置指南 (Security Configuration Guide)

## API 密鑰配置 (API Key Configuration)

### 當前實施 (Current Implementation)

目前，匯率API密鑰存儲在 `module/Config.js` 文件中。雖然這比硬編碼在代碼中更好，但仍不是最佳實踐。

### 推薦的生產環境配置 (Recommended Production Setup)

#### 選項 1: 使用 react-native-config

1. 安裝依賴:
```bash
npm install react-native-config
npx pod-install  # iOS only
```

2. 創建 `.env` 文件（已在 `.gitignore` 中）:
```
EXCHANGE_RATE_API_KEY=your_actual_api_key_here
EXCHANGE_RATE_API_URL=https://exchange-rates.abstractapi.com/v1/live/
```

3. 更新 `module/Config.js`:
```javascript
import Config from 'react-native-config';

export const getExchangeRateConfig = () => {
    const apiKey = Config.EXCHANGE_RATE_API_KEY;
    const apiUrl = Config.EXCHANGE_RATE_API_URL || 'https://exchange-rates.abstractapi.com/v1/live/';
    return { apiKey, apiUrl };
};
```

#### 選項 2: 使用 CI/CD 環境變量

在構建過程中通過 CI/CD 系統注入環境變量。

## 數據庫安全 (Database Security)

### 當前實施
- 使用 SQLite 本地存儲
- 使用參數化查詢防止 SQL 注入
- 實施輸入驗證

### 建議改進

#### 啟用 SQLCipher 加密

1. 安裝 SQLCipher:
```bash
npm install react-native-sqlcipher-storage
```

2. 遷移代碼以使用加密數據庫

## 文件系統安全 (File System Security)

### 已實施的措施
- ✅ 文件路徑驗證
- ✅ 數據庫編號範圍檢查
- ✅ 安全的文件路徑構建

### 最佳實踐
- 不要信任用戶輸入的文件路徑
- 始終驗證文件操作的參數
- 使用白名單而非黑名單

## 輸入驗證 (Input Validation)

### 已實施的驗證規則

| 欄位 | 最大長度 | 驗證規則 |
|------|---------|----------|
| 匯率 | N/A | 數字，範圍: 0-10000 |
| 公司名稱（中文） | 50 | 僅中文字符和空格 |
| 公司名稱（英文） | 50 | 僅英文字母和空格 |
| 司機名稱 | 30 | 非空 |
| 車牌號碼 | 20 | 大寫字母、數字和空格 |
| 電郵地址 | 100 | 標準電郵格式 |
| 存檔名稱 | 30 | 非空白 |
| 地點輸入 | 50 | 用於自動完成 |

## 網絡安全 (Network Security)

### 當前措施
- ✅ 使用 HTTPS
- ✅ API 密鑰管理

### 建議改進
- 實施證書固定 (Certificate Pinning)
- 添加請求超時
- 實施重試邏輯與指數退避

## 錯誤處理 (Error Handling)

### 最佳實踐
```javascript
// 不要這樣做 (DON'T)
console.error('Database error:', error.message, error.stack);

// 應該這樣做 (DO)
if (__DEV__) {
    console.error('Database error:', error.message);
}
// 只向用戶顯示通用錯誤消息
ToastAndroid.show('操作失敗，請稍後重試', ToastAndroid.SHORT);
```

## 構建配置 (Build Configuration)

### Android ProGuard

確保 `android/app/proguard-rules.pro` 包含適當的規則以保護代碼。

### iOS 配置

在發布構建中啟用適當的優化和保護。

## 安全檢查清單 (Security Checklist)

構建前檢查：

- [ ] 沒有硬編碼的密鑰或密碼
- [ ] `.env` 文件不在版本控制中
- [ ] 所有依賴項都已更新
- [ ] 運行 `npm audit` 無高危漏洞
- [ ] 生產構建啟用代碼混淆
- [ ] 移除所有調試日誌
- [ ] 輸入驗證已實施
- [ ] SQL 查詢使用參數化

## 持續監控 (Continuous Monitoring)

### 定期檢查
```bash
# 每週運行
npm audit
npm outdated

# 更新依賴項
npm update
npm audit fix
```

## 報告安全問題 (Reporting Security Issues)

如果您發現安全漏洞，請不要公開報告。請聯繫維護者：

- Email: [在此添加郵箱]
- GitHub Issues: 使用 "Security" 標籤（僅用於非緊急問題）

## 參考資源 (Resources)

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [React Native Security](https://reactnative.dev/docs/security)
- [SQLite Security](https://www.sqlite.org/security.html)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)

---

*最後更新: 2025-10-14*
