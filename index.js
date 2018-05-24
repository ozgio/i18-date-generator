
const generateAll = require("./lib/dayjs/generate");

(async () =>{
    let result = 0;
    
    try{
        result = await generateAll('./output');
    }catch(err){
        console.error("Sorry can not complete the process");
        console.error(err);
        process.exit(1);
    }

})();
