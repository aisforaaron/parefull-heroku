// Parefull ExpressJS API Server


// Packages
// =============================================================================

var express      = require('express');
var path         = require('path');
var bodyParser   = require('body-parser');      // work with POST
var superagent   = require('superagent');       // api layer
var mongoose     = require('mongoose');         // db layer
var bit          = require('./models/bit');     // custom schema for parefull items (bits)
// var browserify   = require('browserify');       // ???
var fs           = require('fs');

// App & DB setup
// =============================================================================

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.enable('trust proxy');  // so i can capture user IP when they add/rate bits

// connect to mongoLab using mongoose
mongoose.connect('mongodb://pareuser:FPOk9aA1QKts@ds039484.mongolab.com:39484/parefull');
mongoose.set('debug', true);

// set api to listen on port 4000
var port             = process.env.PORT || 4000;        // set our port
var listen           = '127.0.0.1';                     // 127.0.0.1 blocks external requests.
// process.env.NODE_ENV = 'local';                         // set our env

// Heroku Config - tell nginx to start listening
fs.openSync('/tmp/app-initialized', 'w');


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
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;


// START THE SERVER
// =============================================================================

app.listen(port, listen);
console.log('Magic happens on port ' + port);
