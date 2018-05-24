module.exports = function (data){
    
    let content = JSON.stringify(data, null, 2);

    return `import dayjs from 'dayjs'

    const locale = ${content};
    
    dayjs.locale(locale, null, true)
    
    export default locale
`};