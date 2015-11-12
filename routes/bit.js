/*
***************************************

API routes for Parefull Bits

Routes definition
  /api/bit
    /               GET all bits 
                    POST new bit
    rand            GET a random bit
    id/:id          GET bit by id 
                    DELETE bit by id
    name/:name      GET bit by name

***************************************
*/

var express    = require('express');
var router     = express.Router();
var Bit        = require('../models/bit');
var Score      = require('../models/score');
var mongoose   = require('mongoose');        // needed for working with ObjectId field type
var superagent = require('superagent');
var google     = require('google-images');
var pareUtils  = require('../lib/utils.js');
var imgUtils   = require('../lib/imgUtils.js');
var fs         = require('fs');
var config     = require('../config');
// logging setup
var bunyan     = require('bunyan');
var log        = bunyan.createLogger({
    name: 'webapp',
    streams: [{
        path: '/home/vagrant/webapp.log',
    }]
});

// =============================================================================

router.route('/test')

    // GET path for testing code
    .get(function(req, res) {
        res.json({message: 'Testing /api/bit/test'})
    })

// =============================================================================

router.route('/')

    // get all the bits (accessed at GET /api/bits)
    .get(function(req, res) {
        Bit.find(function(err, bits) {
            if (err) throw err;
            res.json(bits);
        });
    })

    // Add new bit (if doesn't exist already)
    // @return json obj of bit 
    .post(function (req, res) {
        log.info('POST /api/bit')
        var name   = req.body.name
        var newBit = false 
        if(name.length > 2) {
            Bit.findOne(
              { name: new RegExp('^'+name+'$', "i")}, // case insensitive, anchors used so Pizz won't match Pizza
              function(err, result) {
                  if (err) throw err
                  if(result!=null) { 
                      // update score and scoreAvg outside of this method
                      log.info('POST /api/bit', 'Bit already in db')
                      res.json(result)
                  } else { 
                      newBit = true
                      // no bit found, add new one
                      log.info('POST /api/bit', 'Adding new bit to db')
                      var bit   = new Bit()
                      bit.name  = name
                      bit.ip    = req.headers['x-forwarded-for']
                      bit.image = null
                      bit.queue = true  // ?? this is actually added the queue in another step ??
                      bit.show  = true
                      bit.save(function(err, result) {
                          if (err) throw err
                          log.info('POST /api/bit', 'Bit saved, adding', bit.name, result._id, 'to googleImage queue')
                          imgUtils.newJob(result._id, bit.name)
                          res.json(result)
                      })
                  }
              })
        } else {
          res.json({ message: 'Validation error on name, ip or score' })
        } 
    });

// =============================================================================

router.route('/rand/?:skip_id?')

    // get one random bit 
    .get(function(req, res) {
        // random number strategy based on http://stackoverflow.com/a/28331323/4079771
        Bit.count({show: true}).exec(function(err, count){
            // make sure count var is within range
            // skipping one doc moves count down one
            // zero key moves count down another one
            // just need to be sure we don't subtract to a negative
            var min    = 0
            var max    = count-2
            var random = pareUtils.randomNumber(min, max)
            var query  = { show: true }
            if(req.params.skip_id){
              query = { _id: { $ne: req.params.skip_id}, show: true }
            } 
            Bit.findOne(query).skip(random).exec(function(err, bit) {
                if(err) throw err
                var bitObj = bit.toObject();
                if(bit.image!=null){
                  // if image exists in document, pass along full img path
                  bitObj.image = config.bitFilePath+bit.image
                  console.log('returned current bit', JSON.stringify(bitObj))
                  res.json(bitObj)
                } else {
                  // add to googleImage queue if queue=false
                  if(bit.queue==false){
                      imgUtils.newJob(bit._id, bit.name)
                  }
                  // return bit w/shrug img
                  bitObj.image = 'assets/images/shrug.jpg'
                  res.json(bitObj)
                }
            })
        })
    });

// =============================================================================

router.route('/id/?:bit_id?')

    // search bit by id
    .get(function(req, res) {
        Bit.findById(req.params.bit_id, function(err, bit) {
            if (err) res.send(err);
            res.json(bit);
        });
    })

    // UPDATE A BIT
    // if a PUT request is sent to /api/bit/id/ w/form vars
    .put(function(req, res) {
        if(req.params.bit_id) { 
          var updateFields = new Object();
          if(req.body.scoreAvg) {
              updateFields.scoreAvg = req.body.scoreAvg
          }
          if(req.body.name) {
              updateFields.name = req.body.name
          }
          if(req.body.queue) {
              if(req.body.queue=='false') {
                  updateFields.queue = false
              } else if(req.body.queue=='true') {
                  updateFields.queue = true
              }
          }
          if(req.body.show) {
              updateFields.show = req.body.show
          }
          if(req.body.imageSourceUrl) {
              updateFields.imageSourceUrl = req.body.imageSourceUrl
          }
          if(req.body.image) {
            if(req.body.image=='null') {
                updateFields.image = null  
            } else {
                updateFields.image = req.body.image
            }
          }
          var bitId = mongoose.Types.ObjectId(req.params.bit_id)
          Bit.findByIdAndUpdate(bitId, updateFields, function(err, result){
            if (err) throw err;
            res.json(result) // returns bit before updated values
          });
        } else {
          res.json({ message: 'No id sent to update bit.'})
        }
    })

    // DELETE the bit
    .delete(function(req, res) {
        Bit.remove({
            _id: req.params.bit_id
        }, function(err, bit) {
            if (err) throw err;
            res.json({ message: 'Successfully deleted bit.' });
        });
    });

// =============================================================================

router.route('/name/:bit_name')

    // search bit by name
    .get(function(req, res) {
        // case insensitive searches use regex
        var bitNameNoCase = new RegExp('^'+req.params.bit_name+'$', "i")
        Bit.find({ name: bitNameNoCase }, function(err, bit) {
            if (err) throw err;
            res.json(bit);
        });
    });

// =============================================================================

router.route('/count')

    // return counter of total bits
    .get(function(req, res) {
        // case insensitive searches use regex
        Bit.collection.count({show: true}, function(err, bit) {
            if (err) throw err;
            res.json(bit);
        });
    });

// =============================================================================

module.exports = router;
