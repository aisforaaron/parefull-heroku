// API routes config.
// Any custom routes here have to have /api prefix.
// nginx will only pass /api/* calls to nodejs server.

var express = require('express');
var router  = express.Router();

/** Load custom routes from files. */
router.use('/api/user', require('./user'));
router.use('/api/bit', require('./bit'));
router.use('/api/score', require('./score'));
router.use('/api/pareque', require('./pareque'));
router.use('/api/curse', require('./curse'));

module.exports = router;
