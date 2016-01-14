// Parefull utililty methods used in components
var config     = require('../config');
var jwt        = require('jsonwebtoken');
var Bit        = require('../models/bit');
var superagent = require('superagent'); // just used for importer
var imgUtils   = require('../lib/imgUtils.js');

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
  },

  // called from /api/bits/import to loop through JSON array of bit name/score to add
  // @bits json parsed array
  importBits: function (bits, i, cb) {
    var self = this
    console.log('importBits i', i)
    if( i < bits.length ) {
      var obj   = bits[i]
      var name  = obj.name
      var score = obj.score
      console.log('Bulk Importer', 'starting process for', name, score);
      var newBit = false 
      if(name.length > 2) {
          Bit.findOne(
            { name: new RegExp('^'+name+'$', "i")}, // case insensitive, anchors used so Pizz won't match Pizza
            function(err, result) {
                if (err) throw err
                if(result!=null) { 
                    console.log('Bulk Importer', 'Bit already in db - skipping item')
                    self.importBits(bits, i+1, function(err, done){
                      console.log('importBits skip done', done)
                      if(done)
                      return cb(null, true)   
                    })
                } else {
                    newBit = true
                    // no bit found, add new one
                    console.log('POST /api/bit', 'Adding new bit to db')
                    var bit   = new Bit()
                    bit.name  = name
                    bit.ip    = 'import' // save 'bulk' instead of IP address
                    bit.image = null
                    bit.show  = false // set to false until google image is processed 
                    bit.scoreAvg = score
                    bit.save(function(err, result) {
                        if (err) throw err
                        console.log('Bulk Importer', 'Bit saved, adding', bit.name, result._id, 'to pareque')
                        imgUtils.newJob(result._id, bit.name) // skip for local testing
                        // Update score here
                        superagent
                          .post('/api/score')
                          .send({ "_bitId": result._id, "score": score})
                          .end(function (err, res) {
                            if(err) throw err
                            self.importBits(bits, i+1, function(err, done){
                              console.log('importBits superagent done', done)
                              if(done)
                              return cb(null, true)
                            })
                          })
                    })
                }
            })
      } else {
        console.log('Bulk Importer', 'Bit validation error - skipping item')
        self.importBits(bits, i+1, function(err, done){
          console.log('importBits validation error done', done)
          if(done)
          return cb(null, true)    
        })
      }
    } else {
      console.log('ended up here')
      return cb(null, true)
      // return true // set done to true so method knows when to return
    }
  }

};
