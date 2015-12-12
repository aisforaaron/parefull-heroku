/*
***************************************

API routes for Parefull Queue Items

Routes definition
  /api/pareque
    /               GET all items
                    POST new item
    next            GET next item to process
    id/:id          GET item by id 
                    DELETE item by id

***************************************
*/

var express    = require('express');
var router     = express.Router();
var Pareque    = require('../models/pareque');
var mongoose   = require('mongoose');        // needed for working with ObjectId field type
var imgUtils   = require('../lib/imgUtils.js');

// =============================================================================

router.route('/test')

    // GET path for testing code
    .get(function(req, res) {
        res.json({message: 'Testing /api/pareque/test'})
    })

// =============================================================================

router.route('/')

    // get all the bits (accessed at GET /api/bits)
    .get(function(req, res) {
        Pareque.find(function(err, items) {
            if (err) throw err;
            res.json(items);
        });
    })

    // Add new item (if doesn't exist already???)
    // @return json obj of item
    .post(function (req, res) {
        console.log('POST /api/pareque')
        console.log('req.params', req.params)
        // add item, no check if exists (not sure if that is needed)
        var pareque    = new Pareque()
        var id         = req.body._bitId
        var mid        = mongoose.Types.ObjectId(id)
        pareque._bitId =  mid // this adding properly? maybe don't need mongoose method?
        console.log('id', id, 'mid', mid)
        pareque.name   = req.body.name
        pareque.status = req.body.status // new items get 'pending'
        pareque.save(function(err, result) {
            if (err) throw err
            console.log('New item added to pareque', mid, req.body.name)
            res.json(result) 
        });
    });


// =============================================================================

router.route('/next')

    // get next item to process (defaults to oldest)
    .get(function(req, res) {
        Pareque.findOne({'status': 'pending'}, function(err, item) {
            if (err) throw err
            if(item) {
              res.json(item)
            } else {
              res.send(null)
            }
        })
    })

// =============================================================================

router.route('/id/?:bit_id?')

    // search by id
    .get(function(req, res) {
        Pareque.findById(req.params.bit_id, function(err, item) {
            if (err) res.send(err);
            res.json(item);
        });
    })

    // UPDATE the item
    .put(function(req, res) {
        if(req.params.bit_id) { 
          var updateFields = new Object();
          if(req.body.status) {
              updateFields.status = req.body.status
          }
          if(req.body.name) {
              updateFields.name = req.body.name
          }

          var bitId = mongoose.Types.ObjectId(req.params.bit_id)

          Pareque.findByIdAndUpdate(bitId, updateFields, function(err, result){
            if (err) throw err
            res.json(result)
          });
        } else {
          res.json({ message: 'No id sent to update pareque item.'})
        }
    })

    // DELETE the item
    .delete(function(req, res) {
        Pareque.remove({
            _id: req.params.bit_id
        }, function(err, item) {
            if (err) throw err;
            res.json({ message: 'Successfully deleted item in pareque.' });
        });
    });

// =============================================================================

router.route('/count')

    // return counter of total bits
    .get(function(req, res) {
        // case insensitive searches use regex
        Pareque.collection.count({show: true}, function(err, result) {
            if (err) throw err;
            res.json(result);
        });
    });

// =============================================================================

module.exports = router;
