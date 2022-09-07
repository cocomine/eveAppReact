/**
 * 格式化銀碼
 * @param Str 銀碼
 */
function formatPrice(Str: string | number) {
    Str = Str.toString();

    const digits = Str.toString().split('.'); // 先分左邊跟小數點
    const integerDigits = digits[0].split(""); // 獎整數的部分切割成陣列
    const threeDigits = []; // 用來存放3個位數的陣列

    // 當數字足夠，從後面取出三個位數，轉成字串塞回 threeDigits
    while (integerDigits.length > 3) {
        threeDigits.unshift(integerDigits.splice(integerDigits.length - 3, 3).join(""));
    }

    threeDigits.unshift(integerDigits.join(""));
    digits[0] = threeDigits.join(',');

    return digits.join(".");
}

export default formatPrice;