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
var rimraf     = require('rimraf');
var config     = require('../config');


// =============================================================================

// for testing

router.route('/test')

    // GET path for testing code
    .get(function(req, res) {
      var test = {message: 'just testing /api/bit/test' }
      res.json(test)
    })

// =============================================================================

// for testing

router.route('/flush')

    // GET path running an image cache flush
    .get(function(req, res) {
      // rm all files/dirs under config.bitFilePath
      // add * to keep the 'bit' dir
      rimraf(config.bitFilePath+'*', function(err, res){
        if(err) throw err;
        console.log('deleted image cache dir contents at '+config.bitFilePath)
        // empty image field from all bit db documents
        // first get all fields 
        Bit.aggregate({ $match: { image: { $ne: null }}}, function(err, bits) {
          if (err) throw err;
          // loop through and update
          for(var i=0; i<bits.length; i++){
            // console.log('bits[i]._id '+bits[i]._id)
            Bit.update({_id: bits[i]._id}, { image: null }, function(err, result) {
              if (err) throw err;
            });
          } // end for
          console.log('updated bit collection to remove image field values')
        });
      }); // end rimraf
      res.json({message: 'Image file and db cache flushed'})
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

    // add new bit (if doesn't exist already)
    .post(function (req, res) {
        var ip    = req.headers['x-forwarded-for']  // pass raw ip to /api/score 
        var name  = req.body.name
        // setup object
        var bit   = new Bit()
        bit.name  = name
        bit.ip    = ip

        // basic validation
        if(name.length > 2) {

/*
          // Figure out bit image
          // @todo, if upsert below - skip this image stuff? 
          //        otherwise will just get new img for existing bit
          var imgUrl   = imgUtils.getGoogleImage(name)        // get rand google image url
          var imgName  = imgUtils.getImageFileName(imgUrl)    // get filename off end of url
          var savePath = imgUtils.getCachedImagePath(imgName) // get local save path for image
          // pass url to cache the image locally
          // if true update bit document
          if(imgUtils.cacheGoogleImage(url)) {
            bit.image  = imgName
          }
*/
          // Add to db
          Bit.findOneAndUpdate(
              { "name" : { $regex : new RegExp(name, "i") } }, // case insensitive
              { $setOnInsert: bit },  // pass bit object, just passing field:value didn't work
              {
                  new: true,          // return updated document if exists
                  upsert: true        // insert the document if it does not exist 
              },
              function(err, result) {
                  if (err) throw err;
                  res.json(result);
              }
          );
        } else {
          res.json({ message: 'Validation error on name, ip or score' });
        } 
    });

// =============================================================================

router.route('/rand/?:skip_id?')

    // get one random bit 
    .get(function(req, res) {
        // random number strategy based on http://stackoverflow.com/a/28331323/4079771
        Bit.count().exec(function(err, count){
          // make sure count var is within range
          // skipping one doc moves count down one
          // zero key moves count down another one
          // just need to be sure we don't subtract to a negative
          // var random = Math.floor(Math.random() * count);
          var min    = 0
          var max    = count-2
          var random = pareUtils.randomNumber(min, max)
          var skipId = ''
          if(req.params.skip_id){
            skipId = { _id: { $ne: req.params.skip_id}}
          }
          // just for testing locally, force one specific bit to return
          Bit.findOne(skipId).skip(random).exec(
          // Bit.findById('5627d6a934bd98360d614a8c').exec( // gym shorts
            function(err, bits) {
            if (err) throw err;
            // ------------------- NEW METHOD?? ------------------
            var bitImg = ''
            if(bits.image!=null){
                  // if image exists in document, pass along full img path
                  var savePath = imgUtils.getCachedImagePath(bits.image, true)
                  bits.image   = savePath+bits.image
                    console.log('returned current bit: '+JSON.stringify(bits))
                    res.json(bits)
            } else {
                  // if no image field in document, get one
                  imgUtils.getSetCache(bits.name, bits._id, function(err, imgName){
                    if(err) throw err;
                    var savePath = imgUtils.getCachedImagePath(imgName, true)
                    bits.image   = savePath+imgName 

                    console.log('returned updated bit: '+JSON.stringify(bits))
                    res.json(bits)
                  });
            }
            // ------------------- /NEW METHOD?? ------------------
          }); //end findOne

        });
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
        console.log('inside put id/:id req.params: '+JSON.stringify(req.params))
        console.log('req.body '+JSON.stringify(req.body))
        if(req.params.bit_id) { 
          var updateFields = new Object();
          if(req.body.scoreAvg) {
              console.log('added scoreAvg to obj')
              updateFields.scoreAvg = req.body.scoreAvg
          }
          if(req.body.name) {
              console.log('added name to obj')
              updateFields.name = req.body.name
          }
          // Image Updates
          if(req.body.image) {
            updateFields.image = req.body.image
            console.log('added image to obj '+updateFields.image)
          }
          var bitId = mongoose.Types.ObjectId(req.params.bit_id)
          console.log('updateFields '+updateFields)
          Bit.findByIdAndUpdate(bitId, updateFields, function(err, result){
            if (err) throw err;
            res.json(result)
            // res.json({message: 'Updated bit.'})
          });
        } else {
          res.json({ message: 'No id sent to update bit.'})
        }
    })

    // delete the bit
    .delete(function(req, res) {
        Bit.remove({
            _id: req.params.bit_id
        }, function(err, bit) {
            if (err) throw err;
            res.json({ message: 'Successfully deleted bit.' });
        });
    });

// =============================================================================

router.route('/id/:bit_id/img')

    // UPDATE A BIT with new image
    // pass name in send field, and bitId in url
    .put(function(req, res) {
        imgUtils.getSetCache(req.body.name, req.params.bit_id, function(err, imgName){
          if(err) throw err;
          console.log('New image saved for new bit.')
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
        Bit.collection.count(function(err, bit) {
            if (err) throw err;
            res.json(bit);
        });
    });

// =============================================================================

module.exports = router;
