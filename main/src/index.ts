import Fastify, {FastifyRequest} from "fastify";
import {getComciganData, fetchCookInfo, fetchSchoolInfo, schoolListFetch, checkSchool} from './server.js';
import { route } from "./frontRoute.js";

const fastify = Fastify({
    logger:true
});

fastify.register(route, {prefix:'/'});//이거 슈밤바/f/main 해야함 /* 모든것

type a = {
    school:string, 
    getnum:number,
}

type b = {
    school:string,
    Year:number,
    class:number,
    zeroOne:number
}

type d = {
    school:string,
}

type c = a & b & d;

type MyRequest<T> = FastifyRequest<{
    Querystring: T
}>

fastify.get('/schoolList', async (req:MyRequest<d>, rep) => {// ?school=새솔
    let d
    if(req.query.school){
        d = await schoolListFetch(req.query.school);
    } else{
        d = '해당 데이터가 존재하지 않음.'
    }
    return d['학교검색']
})

fastify.get('/cookInfo', async (req:MyRequest<c>, rep) => { // ?school=학교&getnum=받아올 양
    const queryObj = req.query
    let d
    if(queryObj.school && queryObj.getnum){
        d = (await fetchCookInfo(queryObj.school, queryObj.getnum)).mealServiceDietInfo[1].row
    } else{
        d = '해당 데이터가 존재하지 않음.'
    }
    return d
});

fastify.get('/comciganData', async (req:MyRequest<c>, rep) => { // ?school=새솔고등학교&Year=1&class=1&zeroOne=1
    const queryObj = req.query
    let d
    if(queryObj.school && queryObj.Year && queryObj.class && queryObj.zeroOne){
        d = await getComciganData(queryObj.school, queryObj.Year, queryObj.class, queryObj.zeroOne);
    } else {
        d = '해당 데이터가 존재하지 않음.'
    }
    return d
});

fastify.get('/checkSchool', async (req:MyRequest<c>, rep) => { // ?school=새솔고등학교&Year=1&class=1
    const queryObj = req.query
    let d
    if(queryObj.school && queryObj.Year && queryObj.class){
        d = await checkSchool(queryObj.school, queryObj.Year, queryObj.class);
    } else{
        d = '해당 데이터가 존재하지 않음.'
    }
    return d
});

fastify.listen(3000, '0.0.0.0', () => {
    console.log('server listening...');
})