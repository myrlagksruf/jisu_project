import iconv from 'iconv-lite';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { fetchNet } from './fetch.js';
import { Datai } from '../../public/type'
// import { fork } from 'child_process';

const urlList = {
    '학교찾기': '',
    '학교정보': '',
    'sc':'',
    '시간표번호_이번주': '',
    '시간표번호_다음주': '',
    '선생님이름': '',
    '과목리스트': '',
}

export async function getscNum(){ // 사이트 스크립트에 데이터 요청할떄 쓰는 고유 번호 가져옴 -> 고유번호가 맨날 바뀜..!
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const euc_ = await fetchNet('/st');

    const euc = euc_.euc
    
    const d: number[] = []
    for (var i = 0; i < 2; i++) {
        if (!d.length) {
            d.push(euc.indexOf('./', i))
        } else {
            d.push(euc.indexOf('./', d[0] + 2))
        }
    }
    urlList.학교찾기 = euc.slice(d[0] + 1, euc.indexOf(`'`, d[0] + 1));
    urlList.학교정보 = euc.slice(d[1] + 1, euc.indexOf(`'`, d[1] + 1));

    urlList.sc = euc.slice(euc.indexOf("sc_data('") + 9, euc.indexOf("sc_data('") + 15)

    urlList.시간표번호_이번주 = euc.slice(euc.indexOf("일일자료=자료.") + 8, euc.indexOf("일일자료=자료.") + 13)
    urlList.시간표번호_다음주 = euc.slice(euc.indexOf("원자료=자료.") + 7, euc.indexOf("원자료=자료.") + 12)

    urlList.선생님이름 = euc.slice(euc.indexOf("th<자료.") + 6, euc.indexOf("th<자료.") + 11)
    urlList.과목리스트 = euc.slice(euc.indexOf(`속성+"'>"+자료.`) + 11, euc.indexOf(`속성+"'>"+자료.`) + 16)
}

const parsingJson = async (res:string) => { // 0 삭제 -> JSON 변환해서 return
    const arr:string[] = []

    res = res.slice(res.indexOf('{'))
    
    for(let i of res){
        if(i.charCodeAt(0) !== 0){
            arr.push(i);
        } else break;
    }
    return JSON.parse(arr.join(''))
}

export const schoolListFetch = async (school:string) => { //학교 검색할때 쓰는 함수 -> 학교들
    let str = iconv.encode(school, 'euc-kr');
    let d = []

    for(let i = 0 ; str.length > i ; i++){
        d.push(`%${str[i].toString(16).toUpperCase()}`)
    }
    if(!urlList['학교찾기']){
        await getscNum(); 
    }
    const euc = await fetchNet(`http://comci.kr:4082${urlList['학교찾기']}${d.join('')}`);
    return parsingJson(euc.utf)
}

const schoolInfoFetch = async (schoolNum:string) => { // 여기에 들어가는 매개변수는 schoolListFetch()했을때 받은 값중에서 마지막 숫자
    const url = Buffer.from(`${urlList['sc']}_${schoolNum}_0_1`, 'utf8').toString('base64') // -> 이거 오류가 있었음 `${urlList['sc']}_ <- 이거 유무${schoolNum}_0_1`
    const euc = await fetchNet(`http://comci.kr:4082${urlList['학교정보']}${url}`);

    return parsingJson(euc.utf)
}


export const getComciganData = async (school:string, a:number, b:number, num:number) => { 
    // 학교 컴시간 데이터 요청하는곳 매개변수에 들어가는 학교이름이 정확해야함 -> 왜냐면 데이터 1개 오는걸 감안하고 만들었기 때문
    const schoolNum = await schoolListFetch(school) // 학교 고유번호 받아옴ㅋ
    const mainData = await schoolInfoFetch(schoolNum['학교검색'][0][3]) //schoolNum에서 받아온 데이터 넘겨줌
    
    const parsingData:Datai = await comciganDataParsing(mainData, a, b, num) //mainData에서 받은 데이터를 파싱해줌

    

    return parsingData
}

const comciganDataParsing = async (arr:any, a:number, b:number, num:number) => { //이거 여기서 데이터 받아서 파싱 하는 함수 임 getComciganData 여기서 받아서하면됨
    const data:Datai = {
        '월': [],
        '화': [],
        '수': [],
        '목': [],
        '금': [],
    }

    await fs.writeFile('./arr.json', JSON.stringify(arr), {encoding:'utf-8'});
    
    const day = ['월', '화', '수', '목', '금'] as const

    const days = ['시간표번호_이번주', '시간표번호_다음주'] as const

    const myComciganData:Array<7> = arr[urlList[days[num]]][a][b]
    
    for(let i = 0 ; i < myComciganData.length ; i++){
        //if(i !== 0){
            for(let j = 0 ; j < day.length + 4; j++){
                const classNumData = String(arr[urlList[days[num]]][a][b][i][j])
                //if(Number(classNumData) !== 0){
                    if(classNumData.length === 3){
                        const l = classNumData.slice(0, 1)
                        const f = classNumData.slice(2)
                        data[day[i - 1]].push([`${arr[urlList.과목리스트][f]}`, `${arr[urlList.선생님이름][l].slice(0, 2)}`])
                    } else if(classNumData.length === 4){
                        const l = classNumData.slice(0, 2)
                        const f = classNumData.slice(2)
                        data[day[i - 1]].push([`${arr[urlList.과목리스트][f]}`, `${arr[urlList.선생님이름][l].slice(0, 2)}`])
                    } else if(classNumData.length === 0){
                        data[day[i - 1]].push(['', ''])
                    }
                //}
            }
        //}
    }
    
    return data
}

//console.log(await getComciganData('새솔고등학교', 1, 1, 0));

//getComciganData('새솔고등학교', 1, 1, 0)//('정확한 학교이름(풀명)', '학년', '반', 이번주, 다음주 시간표 판단 (0:이번주,1:다음주))
//여기 부터 급식 정보 가져오는거

const neisApis = { //나이스에 fetch할떄 필요한 key, url
    key: 'dd01d62062ee4a26a12d9ea34e7b77a7',
    학교기본정보: 'https://open.neis.go.kr/hub/schoolInfo',
    급식식단정보: 'https://open.neis.go.kr/hub/mealServiceDietInfo',
    반정보: 'https://open.neis.go.kr/hub/classInfo',
}

const changeDay = (i:number) => {
    const Day = new Date()
    console.log(Day);
    Day.setDate(Day.getDate() + Number(i))
    console.log(Day);
    const y: string = `${Day.getFullYear()}`.padStart(2, '0');
    const m: string = `${Day.getMonth() + 1}`.padStart(2, '0');
    const d: string = `${Day.getDate()}`.padStart(2, '0');

    return `${y}${m}${d}`
}

interface SCINFO {
    ATPT_OFCDC_SC_CODE: string;
    SD_SCHUL_CODE: string;
    SCHUL_NMd: string;
}

export const fetchSchoolInfo = async (schoolName:string) => {  //학교 정보를 가져 오는 코드
    const res = await (await fetch(`${neisApis['학교기본정보']}?KEY=${neisApis.key}&Type=json&pIndex=1&pSize=100&SCHUL_NM=${schoolName}`)).json()
    
    const arr:SCINFO = {
        ATPT_OFCDC_SC_CODE: res.schoolInfo[1].row[0].ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE: res.schoolInfo[1].row[0].SD_SCHUL_CODE,
        SCHUL_NMd: res.schoolInfo[1].row[0].SCHUL_NM,
    }
    return arr
}

export const fetchCookInfo = async (schoolName:string, getNum:number) => { //급식 정보를 가져온다.
    const arr = await fetchSchoolInfo(schoolName)
    
    const dayList:string[] = []

    for(let i = 0 ; i < 2 ; i++){
        if(i !== 0){
            dayList.push(changeDay(getNum))
        } else {
            const Day = new Date()  
            const month = `${Day.getMonth() + 1}`.padStart(2, '0');
            const date = `${Day.getDate()}`.padStart(2, '0');
            const now = `${Day.getFullYear()}${month}${date}`;
            dayList.push(now)
        }
    }
    
    
    const res = await (await fetch(`${neisApis.급식식단정보}?KEY=${neisApis.key}&Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=${arr.ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${arr.SD_SCHUL_CODE}&MLSV_FROM_YMD=${dayList[0]}&MLSV_TO_YMD=${dayList[1]}`)).json()
    
    return res
}

export const checkSchool = async (schoolName:string, year:number, Class:number) => {
    const schoolInfo = await fetchSchoolInfo(schoolName)
    const date = new Date()
    
    const res = await (await fetch(`${neisApis.반정보}?KEY=${neisApis.key}&Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${schoolInfo.ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${schoolInfo.SD_SCHUL_CODE}&AY=${date.getFullYear()}&GRADE=${year}`)).json()
    
    try{
        if(res.classInfo[1].row.length >= Class){
            return true
        } else{
            return false
        }
    } finally{
        return false
    }
}

//console.log(await checkSchool('새솔고등학교', 1, 1));




//fetchCookInfo('새솔고등학교', 3)

//const c = (await fetchCookInfo('새솔고등학교', 1)).mealServiceDietInfo[1].row


