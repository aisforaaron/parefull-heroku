/**
 * Parefull utility methods used in components.
 *
 * @callback requestCallback
 */

var config     = require('../config');
var jwt        = require('jsonwebtoken');
var bit        = require('../models/bit');
var superAgent = require('superagent');
var imgUtils   = require('../lib/imgUtils.js');
var logUtils   = require('../lib/logUtils.js');
var bunyan     = require('bunyan');
var log        = logUtils.setupLogging('parefull', true, config.logging.parefull);

module.exports = {

    /**
     * Duplicate method from parefullUtils.js.
     * @todo bundle this method for front end output?
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    randomNumber: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },

    /**
     * Generate JWT token
     * Not sure if this is secure yet.
     * @returns {object} json token
     *
    generateToken: function () {
        var claims = {name: 'parefullAPI', time: Date.now()};
        return jwt.sign(claims, config.apiSecret, {expiresIn: '1d'});
    },*/

    /**
     * JWT path protection
     * These routes are only used manually from POSTman for now.
     * @param {object} req
     * @param {string} req.body.token
     * @param {object} res
     * @param {requestCallback} next
     * @returns {Request|*}
     */
    protectRoute: function (req, res, next) {
        log.info('Checking auth on route');
        var token = req.body.token || req.query.token || req.headers['x-access-token'];
        if (token) {
            jwt.verify(token, config.apiSecret, function (err, decoded) {
                if (err) {
                    return res.status(403).send({
                        success: false,
                        message: 'Token error.'
                    });
                } else {
                    next();
                }
            });
        } else {
            return res.status(403).send({
                success: false,
                message: 'No token provided.'
            });
        }
    },

    /**
     * Loop through JSON array of bit name/score to add.
     * @todo switch to async.map and break into diff methods
     * Called from /api/bits/import.
     * @param {array} bits - json parsed array
     * @param {number} bits.length
     * @param i
     * @param cb
     * @returns {*}
     */
    importBits: function (bits, i, cb) {
        var self = this;
        log.info('importBits i '+i);
        if (i < bits.length) {
            var obj   = bits[i];
            var name  = obj.name;
            var score = obj.score;
            log.info('Bulk Importer', 'starting process for '+name+' '+score);
            var newBit = false;
            if (name.length > 2) {
                bit.findOne(
                    {name: new RegExp('^' + name + '$', 'i')},
                    function (err, result) {
                        if (err) {
                            throw err;
                        }
                        if (result != null) {
                            log.info('Bulk Importer', 'Bit already in db - skipping item');
                            self.importBits(bits, i + 1, function (err, done) {
                                log.info('importBits skip done'+done);
                                if (done) {
                                    return cb(null, true);
                                }
                            });
                        } else {
                            newBit = true;
                            // no bit found, add new one
                            log.info('POST /api/bit - Adding new bit to db');
                            var bitNew      = new bit();
                            bitNew.name     = name;
                            bitNew.ip       = 'import';
                            bitNew.image    = null;
                            bitNew.show     = false; // set to false until google image is processed
                            bitNew.scoreAvg = score;
                            bitNew.save(function (err, result) {
                                if (err) {
                                    throw err;
                                }
                                log.info('Bulk Importer - Bit saved, adding '+bitNew.name+' '+result._id+' to pareque');
                                imgUtils.newJob(result._id, bitNew.name); // skip for local testing
                                // Update score here
                                superAgent
                                    .post('/api/score')
                                    .send({'_bitId': result._id, 'score': score})
                                    .end(function (err) {
                                        if (err) {
                                            throw err;
                                        } else {
                                            self.importBits(bits, i + 1, function (err, done) {
                                                log.info('importBits superAgent done '+done);
                                                if (done) {
                                                    return cb(null, true);
                                                }
                                            });
                                        }
                                    });
                            });
                        }
                    });
            } else {
                log.info('Bulk Importer - Bit validation error - skipping item');
                self.importBits(bits, i + 1, function (err, done) {
                    log.info('importBits validation error done '+done);
                    if (done) {
                        return cb(null, true);
                    }
                });
            }
        } else {
            log.info('ended up here');
            return cb(null, true);
        }
    }

};
