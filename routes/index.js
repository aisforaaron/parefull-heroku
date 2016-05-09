// API routes config.
// Any custom routes here have to have /api prefix.
// nginx will only pass /api/* calls to nodejs server.

var express   = require('express');
var router    = express.Router();
var pareUtils = require('../lib/utils.js');

router.route('/api/testy')

    .get(pareUtils.protectRoute, function (req, res) {
        res.send('Parefull testy');
    });

router.route('/test')

    .get(pareUtils.protectRoute, function (req, res) {
        res.send('Parefull test page. Your IP: ' + req.ip);
    });

router.route('/')

    .get(pareUtils.protectRoute, function (req, res) {
        res.send('Parefull API index route');
    });

/** Load custom routes from files. */
router.use('/api/bit', require('./bit'));
router.use('/api/score', require('./score'));
router.use('/api/pareque', require('./pareque'));

module.exports = router;
