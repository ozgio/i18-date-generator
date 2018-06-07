const util = require('util');
const fs = require('fs');
const path = require('path');

const GenerationError = require('../error');
const render = require('./render');
const config = require("./config.json");

const locales = /*['en', 'tr', 'ca']; */ config.locales;
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
    
    let gregorianCal = data.calendars.gregorian;
    let localeData = {
        name: locale,
        weekdays: weekdayKeys.map(e => capitalizeFirst(gregorianCal.days["stand-alone"]["wide"][e])),
        weekdaysShort: weekdayKeys.map(e => capitalizeFirst(gregorianCal.days["stand-alone"]["abbreviated"][e])),
        weekdaysMin: weekdayKeys.map(e => capitalizeFirst(gregorianCal.days["stand-alone"]["short"][e])),
        months: monthKeys.map(e => capitalizeFirst(gregorianCal.months["stand-alone"]["wide"][e])),
        monthsShort: monthKeys.map(e => capitalizeFirst(gregorianCal.months["stand-alone"]["abbreviated"][e])) 
    }

    let relativeTime = generateRelativeTimeData(data, locale)
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

let generateRelativeTimeData = function(data, locale){
    if(!data.fields.year['relativeTime-type-future'] || !data.fields.year['relativeTime-type-future']['relativeTimePattern-count-one'] || !data.fields.year['relativeTime-type-past'] || !data.fields.year['relativeTime-type-past']['relativeTimePattern-count-one']){
        console.log(`relativeTime-type* data is missing for ${locale}`)
        return null
    }
            

    let futureAll = data.fields.year['relativeTime-type-future']['relativeTimePattern-count-one'].replace('{0}', '_0_');
    let pastAll =  data.fields.year['relativeTime-type-past']['relativeTimePattern-count-one'].replace('{0}', '_0_');
    let common = getIntersectionFromStrings(futureAll, pastAll);
    if(!common){
        console.log(`cannot find common for ${locale}: f:${futureAll} - p:${pastAll}`)
        return null;
    }

    let commonRegex =  new RegExp('\\b' + common + '\\b');

    //values for .future and ,past
    let futureTpl = futureAll.replace(commonRegex, "%s");
    let pastTpl = pastAll.replace(commonRegex, "%s");

    //word(s) for future. This will be deleted from cldr future data in convert function
    //ex: "in {0} days" => futureStr: "in {0}"; relative.mm => in %d minutes => %d minutes
    let futureStr = futureAll.replace(commonRegex, "").trim();

    if(!futureTpl || !pastTpl || futureTpl.indexOf("_0_")>=0 || pastTpl.indexOf("_0_")>=0){
        console.log(`cannot create relative time template for ${locale}=> common:${common}, futureTpl:${futureTpl} - pastTpl:${pastTpl}, futureStr:${futureStr}`)
        return null
    }
    
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
    let outputPath = path.join(outputDir, `${locale}.js`);
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
        let content = await generateByLocale(inputDir, locale);
        let filePath = await writeLocaleFile(outputDir, locale, content);
        console.log(locale, "file is written to", filePath);
    }

    return locales;
}

module.exports = run;