// API routes for Parefull Queue Items.

var express   = require('express');
var router    = express.Router();
var pareQue   = require('../models/pareque');
var mongoose  = require('mongoose');
var pareUtils = require('../lib/utils.js');

router.route('/')

    /**
     * @api {get} /api/pareque Get all bits
     * @apiName GetParequeBits
     * @apiGroup Pareque
     * @apiSuccess {string} - json bits returned from mongo find
     * @apiError {object} - Mongo find error
     */
    .get(function (req, res) {
        pareQue.find(function (err, items) {
            if (err) {
                throw err;
            } else {
                res.json(items);
            }
        });
    })

    /**
     * @api {post} /api/pareque Post new bit
     * @apiName PostParequeBit
     * @apiGroup Pareque
     * @apiParam {string} _bitId bit id to add to pareque
     * @apiParam {string} name bit name so process has this info in same collection
     * @apiParam {string} status status of bit in pareque (null, pending, done, error, skip)
     * @apiSuccess {string} - json result of mongo save or json data of bit if already exists
     * @apiError {object} - Mongo findOne or save error
     */
    .post(function (req, res) {
        console.log('POST /api/pareque req.body', req.body);
        var id = req.body._bitId;
        pareQue.findOne({_bitId: id}, function (err, result) {
            if (err) {
                throw err;
            } else {
                if (result != null) {
                    res.json(result);
                } else {
                    var pareQueBit    = new pareQue();
                    pareQueBit._bitId = id;
                    pareQueBit.name   = req.body.name;
                    pareQueBit.status = req.body.status;
                    pareQueBit.save(function (err, result) {
                        if (err) {
                            throw err;
                        } else {
                            console.log('New item added to pareque', id, req.body.name);
                            res.json(result);
                        }
                    });
                }
            }
        });
    });

router.route('/next')

    /**
     * @api {get} /api/pareque/next Get next bit
     * @apiName GetNextParequeBit
     * @apiGroup Pareque
     * @apiSuccess {string} - json bit returned from mongo findOne or null if no next bit
     * @apiError {object} - Mongo findOne error or res.send(null)
     */
    .get(function (req, res) {
        pareQue.findOne({'status': 'pending'}, function (err, item) {
            if (err) {
                throw err;
            } else {
                if (item) {
                    res.json(item);
                } else {
                    res.send(null);
                }
            }
        });
    });

router.route('/id/:bit_id')

    /**
     * @api {get} /api/pareque/id/:bit_id Get bit by id
     * @apiName GetParequeBitById
     * @apiGroup Pareque
     * @apiParam {string} bit_id bit id to update in pareque
     * @apiSuccess {string} - json bit returned from mongo findById or null if no bit found
     * @apiError {object} - Mongo findById error
     */
    .get(function (req, res) {
        pareQue.findById(req.params.bit_id, function (err, item) {
            if (err) {
                throw err;
            } else {
                if (item) {
                    res.json(item);
                } else {
                    res.send(null);
                }
            }
        });
    })

    /**
     * @api {put} /api/pareque/id/:bit_id Update bit
     * @apiName UpdateParequeBit
     * @apiGroup Pareque
     * @apiParam {string} bit_id bit id to update in pareque
     * @apiParam {string} status bit id status in pareque (null, pending, done, error, skip)
     * @apiParam {string} name bit name
     * @apiSuccess {string} - json bit returned from mongo findByIdAndUpdate
     * @apiError {string} message No id sent to update pareque item
     * @apiError {object} - Mongo findByIdAndUpdate error
     */
    .put(function (req, res) {
        if (req.params.bit_id) {
            var updateFields = {};
            if (req.body.status) {
                updateFields.status = req.body.status;
            }
            if (req.body.name) {
                updateFields.name = req.body.name;
            }
            var bitId = mongoose.Types.ObjectId(req.params.bit_id);
            pareQue.findByIdAndUpdate(bitId, updateFields, function (err, result) {
                if (err) {
                    throw err;
                } else {
                    res.json(result);
                }
            });
        } else {
            res.json({message: 'No id sent to update pareque item.'});
        }
    })

    /**
     * @api {delete} /api/pareque/id/:bit_id Delete bit
     * @apiName DeleteParequeBit
     * @apiGroup Pareque
     * @apiParam {string} bit_id bit id to delete from pareque
     * @apiSuccess {string} message Successfully deleted item in pareque.
     * @apiError {object} - Mongo remove error
     */
    .delete(pareUtils.protectRoute, function (req, res) {
        pareQue.remove({_id: req.params.bit_id}, function (err) {
            if (err) {
                throw err;
            } else {
                res.json({message: 'Successfully deleted item in pareque.'});
            }
        });
    });

router.route('/count')

    /**
     * @api {get} /api/pareque/count Get count of bits
     * @apiName DeleteParequeBit
     * @apiGroup Pareque
     * @apiSuccess {string} - json result from Mongo collection.count
     * @apiError {object} - Mongo collection.count error
     */
    .get(function (req, res) {
        // case insensitive searches use regex
        pareQue.collection.count({show: true}, function (err, result) {
            if (err) {
                throw err;
            } else {
                res.json(result);
            }
        });
    });

module.exports = router;
