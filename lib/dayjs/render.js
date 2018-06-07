module.exports = function (data){
    
    let relativeTime = JSON.stringify(data.relativeTime, null, 4);
    let relativeTimeStr = relativeTime? `,\n  relativeTime: ${relativeTime}`:""

    return `import dayjs from 'dayjs'

const locale = {
  name: '${data.name}',
  weekdays: '${data.weekdays.join('_')}'.split('_'),
  weekdaysShort: '${data.weekdaysShort.join('_')}'.split('_'),
  weekdaysMin: '${data.weekdaysMin.join('_')}'.split('_'),
  months: '${data.months.join('_')}'.split('_'),
  monthsShort: '${data.monthsShort.join('_')}'.split('_')${relativeTimeStr}
}

dayjs.locale(locale, null, true)

export default locale
`};