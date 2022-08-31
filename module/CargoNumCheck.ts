function CargoNumCheck(CargoLetter: string, CargoNum: string, CargoCheckNum: number) {
    //分拆字元
    let CargoLetterArray = CargoLetter.split("");
    let CargoNumArray = CargoNum.split("");
    let CargoLetterTransformArray: number[] = [];
    let CargoNumTransformArray: number[] = [];

    //英文轉換數字
    for (let i = 0; i < CargoLetterArray.length; i++) {
        CargoLetterTransformArray[i] = (function () {
            if (CargoLetterArray[i] === "A") {
                return 10;
            } else {
                const [LetterList, LetterList2, LetterList3] = ["BCDEFGHIJK", "LMNOPQRSTU", "VWXYZ"];
                let index = LetterList.indexOf(CargoLetterArray[i]);
                if (index < 0) {
                    index = LetterList2.indexOf(CargoLetterArray[i]);
                    if (index < 0) {
                        index = LetterList3.indexOf(CargoLetterArray[i]);
                        return 34 + index
                    }
                    return 23 + index;
                }
                return 12 + index;
            }
        })();
    }

    //字串轉換數字
    for (let i = 0; i < CargoNum.length; i++) {
        CargoNumTransformArray[i] = parseInt(CargoNumArray[i]);
    }

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