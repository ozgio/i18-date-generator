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

    let output = ""

    try{
        output = render(localeData);
    }catch(err){
        throw new GenerationError(`Cannot render for ${locale}`, err);
    }
    
    return output;
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