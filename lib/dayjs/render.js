module.exports = function (data){
    
    let weekdays = data.weekdays.join('_');
    let months = data.months.join('_');

    return `import dayjs from 'dayjs'

const locale = {
  name: '${data.name}',
  weekdays: '${weekdays}'.split('_'),
  months: '${months}'.split('_')
}

dayjs.locale(locale, null, true)

export default locale
`};