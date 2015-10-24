var express = require('express');
var router = express.Router();

// =============================================================================

// any custom routes here have to have /api prefix
// nginx will only pass /api/* calls to nodejs server
router
    .get('/api/testy', function (req, res) {
        res.send('Parefull testy');
    });

router
    .get('/test', function (req, res) {
        res.send('Parefull test page. Your IP: '+req.ip);
    });

router.route('/')

    // /api home 
    .get(function (req, res) {
        res.send('Parefull API index route');
    });

// =============================================================================

// Load custom routes from files
router.use('/api/bit', require('./bit'))  // @todo change path to /api/bit here?
router.use('/api/score', require('./score'))

module.exports = router;
