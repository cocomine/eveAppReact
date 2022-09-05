/**
 * 檢查櫃號完整性
 * @param CargoLetter 前四個英文字母
 * @param CargoNum 中間六位數字
 * @param CargoCheckNum 括號內數字
 * @constructor
 */
function CargoNumCheck(CargoLetter: string, CargoNum: string, CargoCheckNum: number) {
    //分拆字元
    let CargoLetterArray = CargoLetter.toUpperCase().split('');
    let CargoNumArray = CargoNum.split('');

    //英文轉換數字
    let CargoLetterTransformArray = CargoLetterArray.map((char) => {
        if (char === "A") {
            return 10;
        } else {
            const [LetterList, LetterList2, LetterList3] = ["BCDEFGHIJK", "LMNOPQRSTU", "VWXYZ"];
            let index = LetterList.indexOf(char);
            if (index < 0) {
                index = LetterList2.indexOf(char);
                if (index < 0) {
                    index = LetterList3.indexOf(char);
                    return 34 + index
                }
                return 23 + index;
            }
            return 12 + index;
        }
    })

    //字串轉換數字
    let CargoNumTransformArray = CargoNumArray.map((char) => parseInt(char))

    //console.log(CargoNum, CargoLetter)

    //進行計算
    let CargoLetterTotal = CargoLetterTransformArray[0] * 1 + CargoLetterTransformArray[1] * 2 + CargoLetterTransformArray[2] * 4 + CargoLetterTransformArray[3] * 8;
    //console.log("CargoLetterTotal", CargoLetterTotal)
    let CargoNumTotal = CargoNumTransformArray[0] * 16 + CargoNumTransformArray[1] * 32 + CargoNumTransformArray[2] * 64 + CargoNumTransformArray[3] * 128 + CargoNumTransformArray[4] * 256 + CargoNumTransformArray[5] * 512;
    //console.log("CargoNumTotal", CargoNumTotal)
    //console.log("Total", (CargoLetterTotal + CargoNumTotal))
    let Test = ((CargoLetterTotal + CargoNumTotal) % 11) % 10;
    //console.log("End", Test)
    return Test === CargoCheckNum;
}

export default CargoNumCheck;