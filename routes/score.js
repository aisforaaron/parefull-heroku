// API routes for Parefull Scores.

var express   = require('express');
var router    = express.Router();
var score     = require('../models/score');
var mongoose  = require('mongoose');
var pareUtils = require('../lib/utils.js');

router.route('/')

    /**
     * @api {get} /api/score Get scores
     * @apiName GetScores
     * @apiGroup Score
     * @apiSuccess {string} - json scores returned from mongo find
     * @apiError {object} - Mongo find error
     */
    .get(function (req, res) {
        score.find(function (err, scores) {
            if (err) {
                throw err;
            } else {
                res.json(scores);
            }
        });
    })

    /**
     * @api {post} /api/score Post new score
     * @apiDescription This comes here from add score form.
     * @apiName PostScore
     * @apiGroup Score
     * @apiParam {number} score score assigned to bit
     * @apiParam {string} _bitId bit id to associate with score
     * @apiParam {string} [ip] user ip address, if not passed will get from headers
     * @apiSuccess {string} - json score data returned from mongo save
     * @apiError {object} - Mongo find error or json message
     */
    .post(function (req, res) {
        var scoreVal = req.body.score;
        var ip       = '';
        var bitId    = req.body._bitId;
        if (req.body.ip) {
            ip = req.body.ip;
        } else {
            ip = req.headers['x-forwarded-for'];
        }
        var scoreNew = new score();
        scoreNew.ip     = ip;
        scoreNew.score  = scoreVal;
        scoreNew._bitId = bitId;
        if ((scoreVal > 0) && (scoreVal < 11) && (bitId.length > 0)) {
            scoreNew.save(function (err, result) {
                if (err) {
                    throw err;
                } else {
                    res.json(result);
                }
            });
        } else {
            res.json({message: 'Please score bit properly - API error.'});
        }
    });

router.route('/id/:score_id')

    /**
     * @api {get} /api/score/id/:score_id Get score by score id
     * @apiName GetScoreById
     * @apiGroup Score
     * @apiParam {string} score id
     * @apiSuccess {string} - json score data returned from mongo findById
     * @apiError {object} - Mongo find error
     */
    .get(function (req, res) {
        score.findById(req.params.score_id, function (err, result) {
            if (err) {
                throw err;
            } else {
                res.json(result);
            }
        });
    })

    /**
     * @api {delete} /api/score/id/:score_id Delete a score
     * @apiName DeleteScore
     * @apiGroup Score
     * @apiParam {string} score id
     * @apiSuccess {string} message Successfully deleted score.
     * @apiError {object} - Mongo find error
     */
    .delete(pareUtils.protectRoute, function (req, res) {
        score.remove({_id: req.params.score_id}, function (err) {
            if (err) {
                throw err;
            } else {
                res.json({message: 'Successfully deleted score.'});
            }
        });
    });

router.route('/avg/:score_bitId')

    /**
     * @api {get} /api/score/avg/:score_bitId Get average score for bit
     * @apiName GetAvgScore
     * @apiGroup Score
     * @apiParam {string} score_bitId bit id to get average score
     * @apiSuccess {string} - json data with average amount
     * @apiSuccess {string} message Bit does not have a score yet.
     * @apiError {object} - Mongo find error
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
                    var roundAvg = Math.round(result[0].avg);
                    res.json(roundAvg);
                } else {
                    res.json({message: 'Bit does not have a score yet.'});
                }
            });
    });

router.route('/pb/:score_bitId')

    /**
     * @api {get} /api/score/pb/:score_bitId Get bit score count
     * @apiName GetParentBitScoreCount
     * @apiGroup Score
     * @apiParam {string} score_bitId
     * @apiSuccess {string} - json result data from mongo count
     * @apiError {object} - Mongo find error
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
     * @api {delete} /api/score/pb/:score_bitId Delete scores
     * @apiName DeleteScoresByBitId
     * @apiGroup Score
     * @apiParam {string} score_bitId
     * @apiSuccess {string} message Successfully deleted all scores with bid id.
     * @apiError {object} - Mongo remove error
     */
    .delete(pareUtils.protectRoute, function (req, res) {
        // objectId type conversion for aggregation
        var bitId = mongoose.Types.ObjectId(req.params.score_bitId);
        score.remove({_bitId: bitId}, function (err, bit) {
            if (err) {
                throw err;
            } else {
                res.json({message: 'Successfully deleted all scores with bid id.'});
            }
        });
    });

module.exports = router;
