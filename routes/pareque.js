// API routes for Parefull Queue Items.

var express    = require('express');
var router     = express.Router();
var pareQue    = require('../models/pareque');
var mongoose   = require('mongoose');
var pareUtils  = require('../lib/utils.js');

router.route('/test')

    /**
     * @api {get} /api/pareque/test Get test path for pareque api
     * @apiName GetParequeTestMessage
     * @apiGroup Pareque
     * @apiSuccess json message
     */
    .get(function(req, res) {
        res.json({message: 'Testing /api/pareque/test'});
    });

router.route('/')

    /**
     * @api {get} /api/pareque Get all bits in pareque
     * @apiName GetParequeBits
     * @apiGroup Pareque
     * @apiSuccess json object
     */
    .get(function(req, res) {
        pareQue.find(function(err, items) {
            if (err) {
                throw err;
            }
            res.json(items);
        });
    })

    /**
     * @api {post} /api/pareque Post new bits to pareque (if doesn't exist already)
     * @apiName PostParequeBit
     * @apiGroup Pareque
     * @apiSuccess json object
     */
    .post(function (req, res) {
        console.log('POST /api/pareque');
        console.log('req.body', req.body);
        var id = req.body._bitId;
        // add one if doesn't exist already, search by bitId
        pareQue.findOne({_bitId: id}, function (err, result) {
            if (err) {
                throw err;
            }
            if (result != null) {
                console.log('POST /api/pareque', 'Bit already in pareque');
                res.json(result);
            } else {
                var pareQueBit    = new pareQue();
                pareQueBit._bitId = id;
                pareQueBit.name   = req.body.name;
                pareQueBit.status = req.body.status;
                pareQueBit.save(function (err, result) {
                    if (err) {
                        throw err;
                    }
                    console.log('New item added to pareque', id, req.body.name);
                    res.json(result);
                });
            }
        });
    });

router.route('/next')

    /**
     * @api {get} /api/pareque/next Get next bit in pareque (defaults to oldest first)
     * @apiName GetNextParequeBit
     * @apiGroup Pareque
     * @apiSuccess json object
     */
    .get(function(req, res) {
        pareQue.findOne({'status': 'pending'}, function(err, item) {
            if (err) {
                throw err;
            }
            if (item) {
              res.json(item);
            } else {
              res.send(null);
            }
        });
    });

router.route('/id/?:bit_id?')

    /**
     * @api {get} /api/pareque/id/?:bit_id? Get bit by id from pareque
     * @apiName GetNextParequeBit
     * @apiGroup Pareque
     * @apiSuccess json object
     */
    .get(function(req, res) {
        pareQue.findById(req.params.bit_id, function(err, item) {
            if (err) {
                res.send(err);
            }
            res.json(item);
        });
    })

    /**
     * @api {put} /api/pareque/id/?:bit_id? Put to update bit by id in pareque
     * @apiName UpdateParequeBit
     * @apiGroup Pareque
     * @apiSuccess json object
     */
    .put(function(req, res) {
        if (req.params.bit_id) {
          var updateFields = {};
          if (req.body.status) {
              updateFields.status = req.body.status;
          }
          if (req.body.name) {
              updateFields.name = req.body.name;
          }
          var bitId = mongoose.Types.ObjectId(req.params.bit_id);
          pareQue.findByIdAndUpdate(bitId, updateFields, function(err, result){
            if (err) {
                throw err;
            }
            res.json(result);
          });
        } else {
          res.json({message: 'No id sent to update pareque item.'});
        }
    })

    /**
     * @api {delete} /api/pareque/id/?:bit_id? Delete bit by id in pareque
     * @apiName DeleteParequeBit
     * @apiGroup Pareque
     * @apiSuccess json message
     */
    .delete(pareUtils.protectRoute, function(req, res) {
        pareQue.remove({_id: req.params.bit_id}, function(err) {
            if (err) {
                throw err;
            }
            res.json({message: 'Successfully deleted item in pareque.'});
        });
    });

router.route('/count')

    /**
     * @api {get} /api/pareque/count Get count of total bits
     * @apiName DeleteParequeBit
     * @apiGroup Pareque
     * @apiSuccess json object
     */
    .get(function(req, res) {
        // case insensitive searches use regex
        pareQue.collection.count({show: true}, function(err, result) {
            if (err) {
                throw err;
            }
            res.json(result);
        });
    });

module.exports = router;
