// API routes for Parefull bits

var express    = require('express');
var router     = express.Router();
var Bit        = require('../models/bit');
var Score      = require('../models/score');
var mongoose   = require('mongoose');        // needed for working with ObjectId field type
var superagent = require('superagent');

/*
Routes definition
  /api/score/
    /               GET all scores, 
                    POST new score, update avg score in bit model
    id/:score_id    GET score by score_id,
                    PUT to update a score -- NOT USED YET,
                    DELETE score by score_id
    avg/:_bitId     GET average score for one bit by _bitId
    pb/:_bitId      GET amount of times a (parent) bit was scored, 
                    DELETE all scores related to a bitId
    * no need to update a score??
*/

/*
  // test route - uncomment as needed
  router
      // api/score/test
      .get('/test', function (req, res) {
          res.send('Parefull scores.');
      });
*/

// =============================================================================

router.route('/')

    // GET all scores
    .get(function(req, res) {
        Score.find(function(err, scores) {
            if (err) throw err;
            res.json(scores);
        });
    })

    // POST new score, then update bit scoreAvg
    .post(function (req, res) {
        console.log('+++ /api/score POST')
        console.log('req.body: '+JSON.stringify(req.body))
        var scoreVal = req.body.score
        var ip       = ''
        var bitId    = req.body._bitId
        // get ip from post or headers
        // from add score form, comes here directly
        if(req.body.ip){
          ip = req.body.ip
        } else {
          ip = req.headers['x-forwarded-for']
        }
        var score    = new Score();            // create a new instance of the model
        score.ip     = ip                      // ip as a string
        score.score  = scoreVal                // set the name (comes from the request)
        score._bitId = bitId                   // id of related bit
        // basic validation
        if( (scoreVal > 0) && (scoreVal < 11) && (bitId.length > 0) ) {
          score.save(function(err, res) {
              if (err) {
                throw err;
              } else {
                // Update Bit avg score
                // var bitIdObject = mongoose.Types.ObjectId(bitId) // passing string over url

                // console.log('bitId: '+bitId+' bitIdObject: '+bitIdObject+' req.body._bitId: '+req.body._bitId)
                console.log('--- put path: /api/bit/id/'+bitId)
                superagent
                  .post('/api/bit/id/'+bitId) // why put not post? why send bitId here? prob can't pass obj in put url
                  .send({"updateAvg": true})
                  .end(function (err, res) {
                    if (err){
                      throw err;
                      console.log(res.error)
                    } else {
                      res.json({ message: 'Score added and bit avg updated!' });
                    }
                  });
              }
            });
        } else {
          res.json({ message: "Please score bit properly - API error."});
        }
    });

// =============================================================================

router.route('/id/:score_id')

    // GET score by score id
    .get(function(req, res) {
        Score.findById(req.params.score_id, function(err, score) {
            if (err) throw err;
            res.json(score);
        });
    })

/*
    // update a score - not needed??
    .put(function(req, res) {
        Score.findById(req.params.bit_id, function(err, score) {
            if (err)
                res.send(err);
            score.score = req.body.score;    // set the name (comes from the request)
            score._bitId = req.body._bitId;  // id of related bit
            score.ip = req.ip
            // save
            score.save(function(err) {
                if (err)
                    res.send(err);
                res.json({ message: 'Score updated!' });
            });
        });
    })
*/
    // delete the score - /api/score/:score_id
    .delete(function(req, res) {
        Score.remove({
            _id: req.params.score_id
        }, function(err, bit) {
            if (err) throw err;
            res.json({ message: 'Successfully deleted score.' });
        });
    });

// =============================================================================

router.route('/avg/:score_bitId')

    // GET average score for one bit by _bitId
    .get(function(req, res) {
      console.log('+++ /api/score/avg/# GET')
      var bitId = mongoose.Types.ObjectId(req.params.score_bitId) // objectId type conversion for aggregation
      Score.aggregate([
          { $match: { "_bitId": bitId } },   // all docs that match passed bitId
          { $group: {                        // get average of scores of all docs with same bitId 
              "_id": "$_bitId",
              "avg": { $avg:"$score"} 
          }}
          ],  
          function (err, result) {
          if (err) {
              next(err);
          } else if (result[0]) {
              // result is an object inside of an array
              var roundAvg = Math.round(result[0].avg)
              res.json(roundAvg);
          } else {
            res.json({message: 'Bit does not have a score yet.'})
          }
      });
    });

// =============================================================================
router.route('/pb/:score_bitId')

    // GET amount of times a (parent) bit was scored (pb = parent bit)
    .get(function(req, res) {
      var bitId = mongoose.Types.ObjectId(req.params.score_bitId)          // objectId type conversion for aggregation
      var count = Score.count({"_bitId": bitId}, function (err, result) {  // use collection.count() with a query
          if (err) {
              next(err);
          } else {
              res.json(result);
          }
        })
    })

    // DELETE all scores related to a bitId
    .delete(function(req, res) {
        var bitId = mongoose.Types.ObjectId(req.params.score_bitId)  // objectId type conversion for aggregation
        Score.remove({
            _bitId: bitId
        }, function(err, bit) {
            if (err) throw err;
            res.json({ message: 'Successfully deleted all scores with passed parent bidId.' });
        });
    });

// =============================================================================

module.exports = router;
