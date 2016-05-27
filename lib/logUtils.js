/**
 * Parefull logging utility methods.
 *
 * @callback requestCallback
 */

var config     = require('../config');
var bunyan     = require('bunyan');

module.exports = {

    /**
     * Setup Bunyan loggers.
     * @param {string} name Logger name
     * @param {boolean} enable Bool flag to override config settings by logger
     * @param {string} filePath Path to log file stream output
     * @returns {object} Logger object
     */
    setupLogging: function (name, enable, filePath) {
        var logConfig = {name: name};
        if ((enable === false) || (config.logging.enable === false)) {
            logConfig.level = 61;
        } else if (config.logging.enable === true) {
            logConfig.streams = [{path: filePath}];
        }
        return bunyan.createLogger(logConfig);
    }

}