// API routes for Parefull Users.

var express = require('express');
var router  = express.Router();
// var pareUtils = require('../lib/utils.js');
var jwt     = require('jsonwebtoken');
var config  = require('../config');

router.route('/token')

    /**
     * @api {post} /api/user/token Post for JWT token
     * @apiDescription Use the app API admin account to generate
     *     a token for use with protected API paths.
     * @apiName PostForToken
     * @apiGroup User
     * @apiParam {string} user Username for admin
     * @apiParam {string} password Password for admin
     * @apiSuccess {string} token JWT signed token
     * @apiError {string} message Authentication failed.
     */
    .post(function (req, res) {
        var user = config.apiUser;
        if ((user.password !== req.body.password) || (user.name !== req.body.name)) {
            res.json({message: 'Authentication failed.'});
        } else {
            // var token = pareUtils.generateToken(user);
            var claims = {name: 'parefullAPI', time: Date.now()};
            var token  = jwt.sign(claims, config.apiSecret, {expiresIn: '1d'});
            res.json({token: token});
        }
    });

module.exports = router;
