/**
 * A class for generator errors
 * @class
 */
class GenerationError extends Error {
    /**
     * Constructs the GenerationError class
     * @param {String} message an error message
     * @param {Error} rootCause the original error message, if GenerationError is used as a wrapper
     * @constructor
     */
    constructor(message, rootCause) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.rootCause = rootCause;
    }

    setRootCause(err){
        this.rootCause = err;
        return this; 
    }
}

module.exports = GenerationError;