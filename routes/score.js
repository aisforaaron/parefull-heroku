// API routes for Parefull Scores.

var express   = require('express');
var router    = express.Router();
var score     = require('../models/score');
var mongoose  = require('mongoose');
var pareUtils = require('../lib/utils.js');

/**
 * @api {get} /api/score/test Get score test path
 * @apiName GetScoreTest
 * @apiGroup Score
 * @apiSuccess json message
 */
router.route('/test')

    /** GET path for testing code. */
    .get(pareUtils.protectRoute, function (req, res) {
        var test = {message: 'Testing /api/score/test'};
        res.json(test);
    });

router.route('/')

    /**
     * @api {get} /api/score Get scores
     * @apiName GetScores
     * @apiGroup Score
     * @apiSuccess json object
     */
    .get(function (req, res) {
        score.find(function (err, scores) {
            if (err) {
                throw err;
            }
            res.json(scores);
        });
    })

    /**
     * @api {post} /api/score Post new score
     * @apiName GetScores
     * @apiGroup Score
     * @apiSuccess json object
     */
    .post(function (req, res) {
        var scoreVal = req.body.score;
        var ip       = '';
        // @todo make sure this doesn't need mongoose.Types.ObjectId(#)
        var bitId    = req.body._bitId;
        // get ip from post or headers
        // from add score form, comes here directly
        if (req.body.ip) {
            ip = req.body.ip;
        } else {
            ip = req.headers['x-forwarded-for'];
        }
        console.log('---POST /api/score scoreVal: ' + scoreVal + ' ip: ' + ip + ' bitId: ' + bitId);
        var scoreNew = new score();
        scoreNew.ip     = ip;
        scoreNew.score  = scoreVal;
        scoreNew._bitId = bitId;
        // basic validation
        if ((scoreVal > 0) && (scoreVal < 11) && (bitId.length > 0)) {
            console.log('/api/score vals passed validation');
            scoreNew.save(function (err, result) {
                if (err) {
                    throw err;
                }
                res.json(result);
            });
        } else {
            res.json({message: 'Please score bit properly - API error.'});
        }
    });

router.route('/id/:score_id')

    /**
     * @api {get} /api/score/id/:score_id Get score by score id
     * @apiName GetScores
     * @apiGroup Score
     * @apiParam {number} score id
     * @apiSuccess json object
     */
    .get(function (req, res) {
        score.findById(req.params.score_id, function (err, result) {
            if (err) {
                throw err;
            }
            res.json(result);
        });
    })

    /**
     * @api {delete} /api/score/id/:score_id Delete score from mongo db
     * @apiName DeleteScore
     * @apiGroup Score
     * @apiParam {number} score id
     * @apiSuccess json message
     */
    .delete(pareUtils.protectRoute, function (req, res) {
        score.remove({_id: req.params.score_id}, function (err) {
            if (err) {
                throw err;
            }
            res.json({message: 'Successfully deleted score.'});
        });
    });

router.route('/avg/:score_bitId')

    /**
     * @api {get} /api/score/avg/:score_bitId Get average score for one bit by _bitId
     * @apiName GetAvgScore
     * @apiGroup Score
     * @apiParam {number} score_bitId
     * @apiSuccess json message
     */
    .get(function (req, res) {
        var bitId = mongoose.Types.ObjectId(req.params.score_bitId);
        score.aggregate([
                {$match: {'_bitId': bitId}},
                {$group: {'_id': '$_bitId', 'avg': {$avg: '$score'}}}
            ],
            function (err, result) {
                if (err) {
                    throw err;
                } else if (result[0]) {
                    // result is an object inside of an array
                    var roundAvg = Math.round(result[0].avg);
                    res.json(roundAvg);
                } else {
                    res.json({message: 'Bit does not have a score yet.'});
                }
            });
    });

router.route('/pb/:score_bitId')

    /**
     * @api {get} /api/score/pb/:score_bitId Get amount of times a (parent) bit was scored
     * @apiName GetParentBitScoreCount
     * @apiGroup Score
     * @apiParam {number} score_bitId
     * @apiSuccess json object
     */
    .get(function (req, res) {
        var bitId = mongoose.Types.ObjectId(req.params.score_bitId);
        var count = score.count({"_bitId": bitId}, function (err, result) {
            if (err) {
                next(err);
            } else {
                res.json(result);
            }
        });
    })

    /**
     * @api {delete} /api/score/pb/:score_bitId Delete all scores related to a bitId
     * @apiName DeleteScoresByBitId
     * @apiGroup Score
     * @apiParam {number} score_bitId
     * @apiSuccess json message
     */
    .delete(pareUtils.protectRoute, function (req, res) {
        // objectId type conversion for aggregation
        var bitId = mongoose.Types.ObjectId(req.params.score_bitId);
        score.remove({_bitId: bitId}, function (err, bit) {
            if (err) {
                throw err;
            }
            res.json({message: 'Successfully deleted all scores with passed parent bidId.'});
        });
    });

module.exports = router;
