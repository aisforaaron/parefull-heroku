// Parefull utililty methods used in components
var config     = require('../config');
var jwt        = require('jsonwebtoken');

module.exports = {

  // dupe from parefullUtils.js - prob have to bundle this method for front end output
  randomNumber: function (min, max) {
    return Math.floor(Math.random()*(max-min+1)+min);
  },

  protectRoute: function (req, res, next) {
    console.log('Checking auth on route')
    // check for token in request - these routes are only used manually from POSTman for now
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
      // verifies secret and checks exp
      jwt.verify(token, config.apiSecret, function(err, decoded) {
        if (err) {
          return false
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
  }

};
