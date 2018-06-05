const util = require('util');
const fs = require('fs');
const path = require('path');

const GenerationError = require('../error');
const render = require('./render');
const config = require("./config.json");

const locales = config.locales;
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const defaultInputDir = "../../node_modules/cldr-dates-full/main";
const fileNames = ["ca-generic.json", "ca-gregorian.json", "dateFields.json", "timeZoneNames.json"];

const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const monthKeys = [...Array(12)].map((_, i) => i+1);

let generateByLocale = async function(inputDir, locale){
    let data = {}

    for(file of fileNames){
        let content = await readLocaleFile(inputDir, locale, file);
        try{
            let dates =  content["main"][locale]["dates"];
            if(dates.calendars) data.calendars =  Object.assign({}, data.calendars, dates.calendars);
            else data = Object.assign(data, dates);
        }catch(err){
            throw new GenerationError(`Can not create locale object for ${locale}/${file}`, err);
        }
    }
    
    let localeData = {
        name: locale,
        weekdays: weekdayKeys.map(e => capitalizeFirst(data.calendars.gregorian.days["stand-alone"]["wide"][e])),
        months: monthKeys.map(e => capitalizeFirst(data.calendars.gregorian.months["stand-alone"]["wide"][e])) 
    }

    let relativeTime = generateRelativeTimeData(data)
    if(relativeTime){
        localeData.relativeTime = relativeTime;
    }

    let output = ""

    try{
        output = render(localeData);
    }catch(err){
        throw new GenerationError(`Cannot render for ${locale}`, err);
    }
    
    return output;
}

/*
 relativeTime: {
    future: '%s sonra',
    past: '%s önce',
    s: 'birkaç saniye',
    m: 'bir dakika',
    mm: '%d dakika',
    h: 'bir saat',
    hh: '%d saat',
    d: 'bir gün',
    dd: '%d gün',
    M: 'bir ay',
    MM: '%d ay',
    y: 'bir yıl',
    yy: '%d yıl'
  },
*/
let generateRelativeTimeData = function(data){
    if(!data.fields.year['relativeTime-type-future'] || !data.fields.year['relativeTime-type-future']['relativeTimePattern-count-one'] || !data.fields.year['relativeTime-type-past'] || !data.fields.year['relativeTime-type-past']['relativeTimePattern-count-one'])
            return null

    let futureAll = data.fields.year['relativeTime-type-future']['relativeTimePattern-count-one'];
    let pastAll =  data.fields.year['relativeTime-type-past']['relativeTimePattern-count-one'];
    let common = getIntersectionFromStrings(futureAll, pastAll);
    if(!common) return null;

    let futureTpl = futureAll.replace(common, "%s");
    let pastTpl = pastAll.replace(common, "%s");

    let futureStr = futureAll.replace(common, "").trim();
    
    function convert(key, single){
        let countKey = `relativeTimePattern-count-${single? "one":"other"}`
        let base = data.fields[key];
        
        if(!base['relativeTime-type-future'] || !base['relativeTime-type-future'][countKey]) return null;
        
        return base['relativeTime-type-future'][countKey].replace(futureStr, "").replace("{0}", "%d").trim();
    }


    return {
        future: futureTpl,
        past: pastTpl,
        s: convert('second', true),
        m: convert('minute', true),
        mm:convert('minute', false),
        h: convert('hour', true),
        hh:convert('hour', false),
        d: convert('day', true),
        dd:convert('day', false),
        M: convert('month', true),
        MM:convert('month', false),
        y: convert('year', true),
        yy:convert('year', false),
    }
}

let getIntersectionFromStrings = function(f, p){
    let fparts = f.split(" ")
    let longestChunk = "";
    for(let i = 0; i<fparts.length-1; i++ ){
        for(let j = i+1; j<=fparts.length; j++ ){
            let chunk  = fparts.slice(i, j).join(" ");
            if(p.indexOf(chunk) >= 0 && chunk.length>longestChunk.length){
                longestChunk = chunk;
            }
        }
    }
    return (longestChunk=="")? null:longestChunk;
}

let capitalizeFirst = function(str){
    if(str.length <= 1) return str.toUpperCase();
    return str[0].toUpperCase() + str.substring(1);
}

let readLocaleFile = async function(inputDir, locale, fileName) {
    let filePath = path.join(__dirname, inputDir, locale, fileName);
    let content, data;

    try{
        content = await readFile(filePath, 'utf8');
    }catch(err){
        throw new GenerationError(`Cannot read file for ${locale}/${fileName}`, err);
    }
    
    try{
        data = JSON.parse(content);
    }catch(err){
        throw new GenerationError(`Cannot parse json for ${locale}/${fileName}`, err);
    }

    return data;
}


let writeLocaleFile = async function(outputDir, locale, content){
    let outputPath = path.join(outputDir, `${locale}.json`);
    try{
        await writeFile(outputPath, content);
    }catch(err){
        throw new GenerationError(`Can not write output file for ${locale}`, err);
    }

    return outputPath;
}


async function run(outputDir, inputDir = defaultInputDir){

    //TODO use promise.all
    for(locale of locales){
        //console.log("Processing", locale)
        let content = await generateByLocale(inputDir, locale);
        let filePath = await writeLocaleFile(outputDir, locale, content);
        console.log(locale, "file is written to", filePath);
    }

    return locales;
}

module.exports = run;