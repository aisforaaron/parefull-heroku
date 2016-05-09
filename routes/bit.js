// API routes for Parefull Bits.
// @todo figure out how to best use apiDefine and apiError w/user groups

var express   = require('express');
var router    = express.Router();
var bit       = require('../models/bit');
var mongoose  = require('mongoose');
var pareUtils = require('../lib/utils.js');
var imgUtils  = require('../lib/imgUtils.js');
var config    = require('../config');

router.route('/test/?:test_number?')

    /**
     * @api {get} /api/bit/test/?:test_number? Test path for bit
     * @apiName GetBitTest
     * @apiGroup Bit
     * @apiDescription JWT token protected route.
     * @apiParam {number} [test_number] Any number to test parameters
     * @apiSuccess {string} message Successful testing of /api/bit/test/?:test_number?
     * @apiError {string} message Param test_number must be a number
     */
    .get(pareUtils.protectRoute, function (req, res) {
        if (!isNumber(req.body.test_number)) {
            res.json({message: 'Param test_number must be a number.'});
        } else {
            res.json({message: 'Successful testing of /api/bit/test/?:test_number?'});
        }
    });

router.route('/')

    /**
     * @api {get} /api/bit Get all bits
     * @apiName GetBits
     * @apiGroup Bit
     * @apiDescription JWT token protected route.
     * @apiSuccess {string} - json bits returned from mongo find
     * @apiError {object} - Mongo find error
     */
    .get(pareUtils.protectRoute, function (req, res) {
        bit.find(function (err, bits) {
            // @todo decide if throw err is better than custom res.end/send w/message
            if (err) {
                throw err;
            }
            res.json(bits);
        });
    })

    /**
     * @api {post} /api/bit Post a new bit
     * @apiName PostBits
     * @apiGroup Bit
     * @apiSuccess {object} - obj result mongo of bit.save
     * @apiError {string} message Validation error on name, ip or score.
     */
    .post(function (req, res) {
        console.log('POST /api/bit');
        var name   = req.body.name;
        var newBit = false;
        if (name.length > 2) {
            bit.findOne(
                // case insensitive, anchors used so Pizz won't match Pizza
                {name: new RegExp('^' + name + '$', "i")},
                function (err, result) {
                    if (err) {
                        throw err;
                    } else {
                        // @todo check the != to see if !== is better
                        if (result != null) {
                            // update score and scoreAvg outside of this method
                            console.log('POST /api/bit', 'Bit already in db');
                            res.json(result);
                        } else {
                            newBit = true;
                            // no bit found, add new one
                            console.log('POST /api/bit', 'Adding new bit to db');
                            var bitAdd   = new bit();
                            bitAdd.name  = name;
                            bitAdd.ip    = req.headers['x-forwarded-for'];
                            bitAdd.image = null;
                            bitAdd.show  = false; // set to false until google image is processed
                            bitAdd.save(function (err, result) {
                                if (err) {
                                    throw err;
                                } else {
                                    console.log('POST /api/bit', 'Bit saved, adding', bit.name, result._id, 'to pareque');
                                    imgUtils.newJob(result._id, bit.name);
                                    res.json(result);
                                }
                            });
                        }
                    }
                });
        } else {
            res.json({message: 'Validation error on name, ip or score.'});
        }
    });

router.route('/import')

    /**
     * @api {post} /api/import Post to add new bits
     * @apiName ImportBits
     * @apiGroup Bit
     * @apiExample {js} Example json setup:
     *     importBits = [{"name":"apples", "score":"6"}, {...}]
     * @apiSuccess {string} message Done with import.
     * @apiError {object} - pareUtils.importBits error returned
     */
    .post(pareUtils.protectRoute, function (req, res) {
        console.log('POST /api/bit/import');
        var importBits = JSON.parse(req.body.importBits);
        pareUtils.importBits(importBits, 0, function (err) {
            if (err) {
                throw err;
            } else {
                console.log('pareUtils returned ok - done with import');
                res.json({message: 'Done with import.'});
            }
        });
    });

router.route('/rand/?:skip_id?')

    /**
     * @api {get} /api/bit/rand/?:skip_id? Get a random bit
     * @apiName GetRandBit
     * @apiGroup Bit
     * @apiSuccess {object} - bit object from mongo
     * @apiError {object} - Mongo findOne throw err
     */
    .get(function (req, res) {
        // random number strategy based on http://stackoverflow.com/a/28331323/4079771
        bit.count({show: true}).exec(function (err, count) {
            // @todo add error check if no bits are returned
            // make sure count var is within range
            // skipping one doc moves count down one
            // zero key moves count down another one
            // just need to be sure we don't subtract to a negative
            var min    = 0;
            var max    = count - 2;
            var random = pareUtils.randomNumber(min, max);
            var query  = {show: true};
            if (req.params.skip_id) {
                query = {_id: {$ne: req.params.skip_id}, show: true};
            }
            bit.findOne(query).skip(random).exec(function (err, bitRand) {
                if (err) {
                    throw err;
                } else {
                    var bitObj = bitRand.toObject();
                    if (bitRand.image !== null && bitRand.image !== 'null') {
                        // if image exists in document, pass along full img path
                        bitObj.image = config.bitFilePath + bitRand.image;
                        console.log('returned current bit', JSON.stringify(bitObj));
                        res.json(bitObj);
                    } else {
                        // add to pareque if bit is showing with broken/null image field
                        if (bitRand.show === true) {
                            imgUtils.newJob(bitRand._id, bitRand.name);
                        }
                        // return bitRand w/shrug img
                        bitObj.image = 'assets/images/shrug.jpg';
                        res.json(bitObj);
                    }
                }
            });
        });
    });


router.route('/id/?:bit_id?')

    /**
     * @api {get} /api/bit/id/?:bit_id? Get bit by id
     * @apiName GetBitById
     * @apiGroup Bit
     * @apiParam {number} [bit_id] bit id to search for
     * @apiSuccess {string} - Mongo findById return json string
     * @apiError {object} - Mongo findById error
     */
    .get(function (req, res) {
        bit.findById(req.params.bit_id, function (err, bitGet) {
            if (err) {
                res.send(err);
            } else {
                res.json(bitGet);
            }
        });
    })

    /**
     * @api {put} /api/bit/id/?:bit_id? Update bit by id
     * @apiName UpdateBitById
     * @apiGroup Bit
     * @apiParam {number} [bit_id] bit id to update
     * @apiSuccess {string} - Mongo result json
     * @apiError {object} - Mongo findByIdAndUpdate error
     */
    .put(function (req, res) {
        console.log('PUT /api/bit start -------- /////////');
        console.log('PUT /api/bit', 'req.params', req.params);
        console.log('PUT /api/bit', 'req.body', req.body);
        if (req.params.bit_id) {
            var updateFields = {};
            if (req.body.scoreAvg) {
                updateFields.scoreAvg = req.body.scoreAvg;
            }
            if (req.body.name) {
                updateFields.name = req.body.name;
            }
            if (req.body.queue) {
                if (req.body.queue === 'false') {
                    updateFields.queue = false;
                } else if (req.body.queue === 'true') {
                    updateFields.queue = true;
                }
            }
            if (req.body.show) {
                updateFields.show = req.body.show;
            }
            if (req.body.imageSourceUrl) {
                updateFields.imageSourceUrl = req.body.imageSourceUrl;
            }
            if (req.body.image) {
                if (req.body.image === 'null') {
                    updateFields.image = null;
                } else {
                    updateFields.image = req.body.image;
                }
            }
            var bitId = mongoose.Types.ObjectId(req.params.bit_id);
            console.log('PUT /api/bit', 'bitId', bitId);
            console.log('PUT /api/bit', 'updateFields', updateFields);
            bit.findByIdAndUpdate(bitId, updateFields, function (err, result) {
                if (err) {
                    throw err;
                } else {
                    res.json(result); // returns bit before updated values
                }
            });
        } else {
            res.json({message: 'No id sent to update bit.'});
        }
    })

    /**
     * @api {delete} /api/bit/id/?:bit_id? Update bit by id
     * @apiName DeleteBitById
     * @apiGroup Bit
     * @apiDescription JWT token protected route.
     * @apiParam {number} [bit_id] bit id to search for
     * @apiSuccess {string} message Successfully deleted bit.
     * @apiError {object} - Mongo remove error
     */
    .delete(pareUtils.protectRoute, function (req, res) {
        bit.remove({
            _id: req.params.bit_id
        }, function (err, bit) {
            if (err) {
                throw err;
            } else {
                res.json({message: 'Successfully deleted bit.'});
            }
        });
    });

router.route('/name/:bit_name')

    /**
     * @api {get} /api/bit/name/:bit_name Get bit by name
     * @apiName GetBitByName
     * @apiGroup Bit
     * @apiParam {string} [bit_name] bit name to search for
     * @apiSuccess {string} - Mongo find result json
     * @apiError {object} - Mongo find error
     */
    .get(function (req, res) {
        var bitNameNoCase = new RegExp('^' + req.params.bit_name + '$', "i");
        bit.find({name: bitNameNoCase}, function (err, bitGet) {
            if (err) {
                throw err;
            } else {
                res.json(bitGet);
            }
        });
    });

router.route('/count')

    /**
     * @api {get} /api/bit/count Get count of total bits in db
     * @apiName GetBitByName
     * @apiGroup Bit
     * @apiParam {string} bit name
     * @apiSuccess {string} - Mongo collection.count result
     * @apiError {object} - Mongo find error
     */
    .get(function (req, res) {
        bit.collection.count({show: true}, function (err, bitGet) {
            if (err) {
                throw err;
            } else {
                res.json(bitGet);
            }
        });
    });

module.exports = router;
