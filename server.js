// Parefull ExpressJS API Server

var express    = require('express');
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');
var fs         = require('fs');
var config     = require('./config');
var pareUtils  = require('./lib/utils.js');
var bunyan     = require('bunyan');
var log        = pareUtils.setupLogging('parefull', true, config.logging.parefull);
var port       = config.port;
var listen     = config.address;
var app        = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('superSecret', config.apiSecret);
app.enable('trust proxy');

/** Start Mongo DB and Mongo logging to Bunyan **/
mongoose.connect(config.db.url, function (err) {
    if (err) {
        log.info('Could not connect to database.', {err: err});
        process.exit(1);
    }
});
if (config.logging.enable === true) {
    mongoose.set('debug', function (collectionName, method, query, doc) {
        log.info('Mongoose debug', {'collectionName': collectionName, 'method': method, 'query': query, 'doc': doc});
    });
}

/** Heroku Config - tell nginx to start listening */
fs.openSync('/tmp/app-initialized', 'w');

/** Routes */
app.use(require('./routes'));

/** Error Handling */
app.use(function (req, res, next) {
    var err    = new Error('Not Found');
    err.status = 404;
    next(err);
});
if (app.get('env') === 'development') {
    app.use(function (err, req, res) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
} else {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}  // only diff from above?
        });
    });
}
module.exports = app;

/** Start the server */
app.listen(port, listen);
log.info('API listening on ' + listen + ':' + port);
