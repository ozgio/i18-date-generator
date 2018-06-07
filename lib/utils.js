const fs = require("fs");

module.exports.printSupportedLocaleNames = function (raw = false) {
    fs.readdir("../node_modules/cldr-dates-full/main", (err, files) => {
        if (err) {
            console.error(err)
            return
        }

        let locales = files.filter(f => {
            return f.length == 2
        })

        if (raw) console.log(locales.join('\n'));
        else console.log('"' + locales.join('", "') + '"');
    });

};