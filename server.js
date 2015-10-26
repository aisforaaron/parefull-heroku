// Parefull ExpressJS API Server


// Packages
// =============================================================================

var express      = require('express');
var path         = require('path');
var bodyParser   = require('body-parser');      // work with POST
var superagent   = require('superagent');       // api layer
var mongoose     = require('mongoose');         // db layer
var bit          = require('./models/bit');     // custom schema for parefull items (bits)
var fs           = require('fs');
var config       = require('./config');

// App & DB setup
// =============================================================================

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.enable('trust proxy');  // so i can capture user IP when they add/rate bits

// connect to mongoLab using mongoose
mongoose.connect(config.db.url, function(err) {
    if (err) {
        console.log('Could not connect to database', config.db.url, ' due to error', err);
        process.exit(1);
    }
});
mongoose.set('debug', true);

// set api to path http://listen:port
var port   = config.port;
var listen = config.address;

// Heroku Config - tell nginx to start listening
fs.openSync('/tmp/app-initialized', 'w'); // test without this line for heroku


// Routes
// =============================================================================

var router = express.Router();
app.use(require('./routes'));


// Error Handling
// =============================================================================

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  // app.use(express.errorHandler()); // another option?
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
} else {
  // production error handler
  // no stacktraces leaked to user
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}  // only diff from above?
    });
  });
}

module.exports = app;


// START THE SERVER
// =============================================================================

app.listen(port, listen);
console.log('API listening on '+listen+':'+port); // test line to remove
