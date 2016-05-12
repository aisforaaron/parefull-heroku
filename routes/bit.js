// API routes for Parefull Bits.

var express   = require('express');
var router    = express.Router();
var bit       = require('../models/bit');
var mongoose  = require('mongoose');
var pareUtils = require('../lib/utils.js');
var imgUtils  = require('../lib/imgUtils.js');
var config    = require('../config');

router.route('/')

    /**
     * @api {get} /api/bit Get all bits
     * @apiName GetBits
     * @apiGroup Bit
     * @apiDescription JWT token protected route.
     * @apiSuccess {string} - json bits returned from Mongo find
     * @apiError {object} - Mongo find error
     */
    .get(pareUtils.protectRoute, function (req, res) {
        bit.find(function (err, bits) {
            if (err) {
                throw err;
            } else {
                res.json(bits);
            }
        });
    })

    /**
     * @api {post} /api/bit Post a new bit
     * @apiName PostBits
     * @apiGroup Bit
     * @apiParam {string} name Name of bit
     * @apiSuccess {object} - obj result Mongo of bit.save
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
                                    console.log('POST /api/bit', 'Bit saved, adding', bitAdd.name, result._id, 'to pareque');
                                    imgUtils.newJob(result._id, bitAdd.name);
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
     * @apiParam {string} importBits JSON data of bits
     * @apiExample {js} Example JSON setup:
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
     * @apiParam {string} [skip_id] If used, method will avoid returning this bit id
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
            // don't subtract to a negative
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


router.route('/id/:bit_id')

    /**
     * @api {get} /api/bit/id/:bit_id Get bit by id
     * @apiName GetBitById
     * @apiGroup Bit
     * @apiParam {string} bit_id bit id to search for
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
     * @api {put} /api/bit/id/:bit_id Update bit by id
     * @apiName UpdateBitById
     * @apiGroup Bit
     * @apiParam {string} bit_id url param for bit id to update
     * @apiParam {number} [scoreAvg] req.body var
     * @apiParam {string} [name] req.body var
     * @apiParam {boolean} [queue] flag to add bit to pareque if true
     * @apiParam {boolean} [show] flag to show/hide bit in public results
     * @apiParam {string} [imageSourceUrl] url of image source before S3 upload
     * @apiParam {string} [image] filename of image
     * @apiSuccess {string} - Mongo result json
     * @apiError {object} - Mongo findByIdAndUpdate error
     */
    .put(function (req, res) {
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
     * @api {delete} /api/bit/id/:bit_id Delete bit by id
     * @apiName DeleteBitById
     * @apiGroup Bit
     * @apiDescription JWT token protected route.
     * @apiParam {string} bit_id bit id to search for
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
     * @apiParam {string} bit_name bit name to search for
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
     * @api {get} /api/bit/count Get count of bits
     * @apiName GetBitByName
     * @apiGroup Bit
     * @apiSuccess {string} - Mongo collection.count result
     * @apiError {object} - Mongo collection.count error
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
