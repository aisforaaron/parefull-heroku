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

router.route('/bit')

    // get all the bits (accessed at GET /api/bits)
    .get(function(req, res) {
        // res.send('this will list all the bits');
        Bit.find(function(err, bits) {
            if (err) throw err;
            res.json(bits);
        });
    })

    // add new bit (if doesn't exist already)
    .post(function (req, res) {
        console.log('+++ /api/bit POST')
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
          // the main query will be findOneAndUpdate along with setOnInsert
          // - setOnInsert to figure out what to add on insert only (if upsert is true), 
          // - if $set { ... }   is used, anything in the braces will be added on insert & update
          // - if you omit the $set then nothing will be updated
          // https://docs.mongodb.org/manual/reference/operator/update/setOnInsert/
          // http://mongoosejs.com/docs/api.html#query_Query-findOneAndUpdate
          Bit.findOneAndUpdate(
              // {"name": name}, // regular search, case sensitive
              { "name" : { $regex : new RegExp(name, "i") } }, // case insensitive
              // set: {}  // leave empty so no update action happens??? @todo test this with diff IP as client
              { $setOnInsert: bit },  // pass bit object, just passing field:value didn't work
              {
                  new: true,   // return updated document if exists
                  upsert: true   // insert the document if it does not exist 
              },
              function(err, result) {
                  if (err) throw err;
                  console.log('bit upserted, result: '+JSON.stringify(result))
                  // Add new bit score to collection
                  // which will then update the new bit scoreAvg 
                  var id = mongoose.Types.ObjectId(result._id) // new or updated bit id
                  console.log('upserted id: '+id)
                  superagent
                    .post('/api/score')
                    .set('Content-Type', 'application/json')
                    .send({ "_bitId": id, "ip": ip, "score": score })
                    .end(function (err, res) {
                      if(err) throw err;
                      console.log('bit upsert, send to score save. ip: '+ip)
                    });
                  res.json({ message: 'Bit created!' });
              }
          );
          /*
          // Original working Model.save, which adds new document
          bit.save(function(err, result) {
              if (err) throw err;
              // console.log('bit saved, result: '+JSON.stringify(result))
              // Add new bit score to collection
              // which will then update the new bit scoreAvg 
              var id = mongoose.Types.ObjectId(result._id) // new bit id
              superagent
                .post('/api/score')
                .set('Content-Type', 'application/json')
                .send({ "_bitId": id, "ip": ip, "score": score })
                .end(function (err, res) {
                  if(err) throw err;
                  console.log('bit save, send to score save. ip: '+ip)
                });
              res.json({ message: 'Bit created!' });
          });
          */
        } else {
          res.json({ message: 'Validation error on name, ip or score' });
        } 
    });

// =============================================================================

// dupe from parefullUtils.js - prob have to bundle this method for front end output
function randomNumber(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

router.route('/bit/rand/?:skip_id?')

    // get all the bits (accessed at GET /api/bits)
    // except for skip_id if passed
    .get(function(req, res) {
        // random number strategy based on http://stackoverflow.com/a/28331323/4079771
        Bit.count().exec(function(err, count){
          // make sure count var is within range
          // skipping one doc moves count down one
          // zero key moves count down another one
          // just need to be sure we don't subtract to a negative
          // var random = Math.floor(Math.random() * count);
          var min = 0
          var max = count-2
          var random = randomNumber(min, max)
          // console.log('rand: '+random+' min/max: '+min+'/'+max)
          var skipId = ''
          if(req.params.skip_id){
            skipId = { _id: { $ne: req.params.skip_id}}
            console.log('skip query: '+skipId)
          }
          Bit.findOne(skipId).skip(random).exec(
            function(err, bits) {
            if (err) throw err;
                getImage(bits.name, function(err, img){
                  if(err) throw err;
                  // console.log('img in return: '+JSON.stringify(img))
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

router.route('/bit/id/:bit_id')

    // search bit by id
    .get(function(req, res) {
        Bit.findById(req.params.bit_id, function(err, bit) {
            if (err)
                res.send(err);
            res.json(bit);
        });
    })

    // UPDATE A BIT
    // if a PUT request is sent to /api/bit/id/:bit_id w/form vars, update the bit
    .put(function(req, res) {
        console.log('+++ /api/bit/id/# PUT')
        // we have the bit id
        // need to calculate the updated scoreAvg and update bit
        superagent
          .get('/api/score/avg/'+req.params.bit_id)
          .set('Accept', 'application/json')
          .end(function (err, score) {
            console.log('4-scoreAvg new value: '+JSON.stringify(score.body))
            var updateFields = new Object()
            // Update score average if flag is passed
            if(req.body.updateAvg) {
                updateFields.scoreAvg = score.body
            }
            // Update bit name
            if(req.body.name) {
                updateFields.name = req.body.name
            }
            console.log('5-Bit fields set to update.')
            // find the bit document and update it in the same call
            var bitId = mongoose.Types.ObjectId(req.params.bit_id) // objectId type conversion for aggregation
            Bit.findByIdAndUpdate(bitId, updateFields, function(err, res){
              if (err) throw err;
              console.log('6-bit fields were updated: '+JSON.stringify(updateFields));
              return; // ??
            });
          });
        res.json({message: 'Updated bit.'})
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

router.route('/bit/name/:bit_name')

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
