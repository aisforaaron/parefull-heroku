// API routes for working witih CursePurse Module.

var express    = require('express');
var router     = express.Router();
var config     = require('../config');
var mongoose   = require('mongoose');
var cursePurse = require('cursepurse');
var logUtils   = require('../lib/logUtils.js');
var pareUtils  = require('../lib/pareUtils.js');
var log        = logUtils.setupLogging('parefull', true, config.logging.parefull);
cursePurse.dbConnect(mongoose, function (err) {
    if (err) {
        log.err('error connecting to cursepurse db');
    }
});

router.route('/import')

    /**
     * @api {post} /api/curse/import Post to add curses to purse
     * @apiName ImportCurses
     * @apiGroup Curse
     * @apiDescription JWT token protected route.
     * @apiParam {string} importCurses array list of text
     * @apiExample {js} Example csv string:
     *     importCurses = something, more stuff, another phrase, words
     * @apiSuccess {string} message Done with import.
     * @apiError {object} - cursePurse.importCurses error returned
     */
    .post(pareUtils.protectRoute, function (req, res) {
        log.info('POST /api/curse/import');
        cursePurse.importCurses(req.body.importCurses, function (err) {
            if (err) {
                log.info('cursePurse import error', {err: err});
            } else {
                log.info('cursePurse returned ok - done with import');
                res.json({message: 'Done with import.'});
            }
        });
    });

module.exports = router;
