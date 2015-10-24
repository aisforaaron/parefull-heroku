// API routes for Parefull bits

var express    = require('express');
var router     = express.Router();
var Bit        = require('../models/bit');
var Score      = require('../models/score');
var mongoose   = require('mongoose');        // needed for working with ObjectId field type
var superagent = require('superagent');
var google     = require('google-images');
// var request    = require('request'); // replace w/superagent call...for image exist check below

/*
Routes definition
  /api/bit
    /               GET all bits, POST new bit
    rand            GET a random bit
    id/:id          GET bit by id, DELETE bit by id
    name/:name      GET bit by name
*/

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
        var score = req.body.score
        // setup object
        var bit   = new Bit()
        bit.name  = name
        bit.ip    = ip
        bit.score = score
        // basic validation
        if((name.length > 2) && (score > 0) && (score < 11)) {
          Bit.findOneAndUpdate(
              { "name" : { $regex : new RegExp(name, "i") } }, // case insensitive
              { $setOnInsert: bit },  // pass bit object, just passing field:value didn't work
              {
                  new: true,   // return updated document if exists
                  upsert: true   // insert the document if it does not exist 
              },
              function(err, result) {
                  if (err) throw err;
                  res.json(result);
                  // // Add new bit score to collection - move this call to front-end callback
                  // // which will then update the new bit scoreAvg 
                  // var id = mongoose.Types.ObjectId(result._id) // new or updated bit id
                  // superagent
                  //   .post('/api/score')
                  //   .send({ "_bitId": id, "ip": ip, "score": score })
                  //   .end(function (err, res) {
                  //     if(err) throw err;
                  //     console.log('bit upsert, send to score save. ip: '+ip)
                  //   });
                  // res.json({ message: 'Bit created!' });
              }
          );
        } else {
          res.json({ message: 'Validation error on name, ip or score' });
        } 
    });

// =============================================================================

// dupe from parefullUtils.js - prob have to bundle this method for front end output
function randomNumber(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

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
          var random = randomNumber(min, max)
          var skipId = ''
          if(req.params.skip_id){
            skipId = { _id: { $ne: req.params.skip_id}}
          }
          Bit.findOne(skipId).skip(random).exec(
            function(err, bits) {
            if (err) throw err;
                getImage(bits.name, function(err, img){
                  if(err) throw err;
                  var bitsObj      = {}
                  bitsObj.img      = img
                  bitsObj.name     = bits.name
                  bitsObj._id      = bits._id
                  bitsObj.ip       = bits.ip
                  bitsObj.__v      = bits.__v
                  bitsObj.scoreAvg = bits.scoreAvg
                  bitsObj.created  = bits.created
                  res.json(bitsObj);
                }); // end getImage cb
          }); //end findOne
        });
    });


    // @todo move to app/lib/file?? and include here?
    function getImage(name, cb) {
        // get rand google image
        // setup options to pass, start with search term then append &name=value pairs
        var imgOptions = name+'&imgsz=small&safe=active' // restrict=cc_attribute'
        google.search(imgOptions, function (err, images) {
            var small = ''
            var temp  = ''
            // loop through and get smallest img by width
            // make sure at least one result
            if(images.length>0) {
              temp = images[0]['width']
              small = images[0]['url']
              console.log('inside images. temp: '+temp)
              for (var img in images) {
                  if(images[img]['width']<temp){
                    temp  = images[img]['width']
                    small = images[img]['url']
                  }
              }
              // console.log('----- sm '+small.length+' temp: '+temp)
              // make sure above logic worked, if not just use shrug image
              if(small.length<1 || temp>400){
                // console.log('set shrug')
                small = '/assets/images/shrug.jpg'
              }
              // // make sure file exists - not working yet, uncomment fs require up top to test
              // var derp = 'http://vignette4.wikia.nocookie.net/farmville/images/d/d3/S_mores-icon.png/revision/latest%3Fcb%3D20111118184105'
              // request(derp, function (err, resp) {
              //   console.log('derp '+JSON.stringify(resp))
              //    if (resp.statusCode != 200) {
              //     console.log('set to derp')
              //     small = '/assets/images/derp.jpg'
              //    } 
              // });
            } else {
              small = '/assets/images/shrug.jpg'
            }
            console.log('return small: '+small)
          return cb(null, small)
        });
    }

// =============================================================================

router.route('/id/?:bit_id?')

    // search bit by id
    .get(function(req, res) {
        Bit.findById(req.params.bit_id, function(err, bit) {
            if (err)
                res.send(err);
            res.json(bit);
        });
    })

    // UPDATE A BIT
    // if a PUT request is sent to /api/bit/id/ w/form vars
    .put(function(req, res) {
        if(req.params.bit_id) { 
          var updateFields = new Object()
          if(req.body.scoreAvg) {
              updateFields.scoreAvg = req.body.scoreAvg
          }
          if(req.body.name) {
              updateFields.name = req.body.name
          }
          var bitId = mongoose.Types.ObjectId(req.params.bit_id)
          Bit.findByIdAndUpdate(bitId, updateFields, function(err, res){
            if (err) throw err;
            res.json({message: 'Updated bit.'})
          });
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

module.exports = router;
