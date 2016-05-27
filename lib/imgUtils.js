/**
 * Parefull utility methods for Image Management.
 *
 * @callback requestCallback
 */

var superAgent = require('superagent');
var fs         = require('fs');
var request    = require('request');
var config     = require('../config');
var aws        = require('aws-sdk');
var mime       = require('mime');
var mongoose   = require('mongoose');
var gm         = require('gm').subClass({imageMagick: true});

var logUtils   = require('../lib/logUtils.js');
var bunyan     = require('bunyan');
var log        = logUtils.setupLogging('parefull', true, config.logging.parefull);

module.exports = {

    /**
     * Add new job to pareque mongo collection.
     * @param {number} id
     * @param {string} name
     */
    newJob: function (id, name) {
        log.info('newJob '+id+' '+name);
        name = name || 'Default_Name';
        id   = mongoose.Types.ObjectId(id);
        superAgent
            .post(config.host+'/api/pareque')
            .send({'name': name, '_bitId': id, 'status': 'pending'})
            .end(function (err) {
                if (err) {
                    throw err;
                }
                log.info('newJob added to pareque '+name+' '+id);
            });
    },

    /**
     * Pass remote image url and save to S3 bits dir.
     * @param {string} imgUrl
     * @param {string} imgName
     * @param {requestCallback} cb
     */
    streamToBucket: function (imgUrl, imgName, cb) {
        log.info('streamToBucket start');
        var s3      = new aws.S3();
        var options = {'uri': imgUrl, 'encoding': null};
        log.info('streamToBucket options', {options: options});
        request
            .get(options, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    var params = {
                        Bucket: config.bitBucketName,
                        Body: body,
                        Key: 'bits/' + config.env + '/' + imgName,
                        ContentType: mime.lookup(imgUrl), //this work right remotely?
                        ACL: 'public-read'
                    };
                    log.info('streamToBucket', 'params', params);
                    s3.upload(params, function (err, data) {
                        if (err) {
                            log.err('streamToBucket errors', err, data);
                            throw err;
                        } else {
                            return cb(null, data);
                        }
                    });
                }
            });
    },

    /**
     * Wrapper method to call all image methods here.
     * @param {string} name
     * @param {string} id bit id related to image
     * @param {requestCallback} cb - call back method
     * @returns {string} json obj of original remote url and new image filename
     */
    getSetCache: function (name, id, cb) {
        log.info('getSetCache start ' + new Date().getTime());
        // 1 - get img from google results
        this.getGoogleImage(name, function (err, imgUrl) {
            if (err) {
                throw err;
            }
            log.info('1 getSetCache '+imgUrl);
            // regex will remove anything not alpha
            // prepend the last 6 chars of the objectId
            // var name = '   The "best" Im@g name_&777   ' // turns into thebestimgname
            var nameStr = name.replace(/[^a-zA-Z]|_/g, '').replace(/\s+/g, ' ').toLowerCase();
            var imgExt  = mime.extension(mime.lookup(imgUrl));
            var idPart  = id.slice(-6);
            var newName = idPart + '-' + nameStr + '.' + imgExt;
            var imgObj  = {name: newName, source: imgUrl};
            log.info('2 getSetCache', 'right before streamtoBucket.');
            // 2 - save file locally to assets/images/bits/
            var savePath = config.imgPath;
            var localImg = savePath + newName;
            request
                .get(imgUrl)
                .on('response', function (resp) {
                    if (resp.statusCode === 200) {
                        log.info('2.5 getSetCache save file locally');
                        var file = fs.createWriteStream(localImg);
                        resp.pipe(file);
                        file.on('finish', function () {
                            file.close(cb);
                            // 3 - resize & remove exif data, replace img with resized one
                            log.info('3 getSetCache start resize');
                            gm(localImg)
                                .resize(200, 200)
                                .noProfile()  // remove exif data
                                .write(localImg, function (err) {
                                    if (err) {
                                        throw err;
                                    }
                                    // 4 - upload local file to S3
                                    log.info('4 getSetCache start S3 upload');
                                    var s3     = new aws.S3();
                                    var params = {
                                        Bucket: config.bitBucketName,
                                        Body: fs.createReadStream(localImg),
                                        Key: 'bits/' + config.env + '/' + newName,
                                        ContentType: mime.lookup(localImg),
                                        ACL: 'public-read'
                                    };
                                    log.info('5 getSetCache streamtoBucket params', {params: params});
                                    s3.upload(params, function (err, data) {
                                        if (err) {
                                            log.info('streamtoBucket errors', {err: err}, {data: data});
                                            throw err;
                                        } else {
                                            // 5 - update bit document with img info
                                            log.info('6 getSetCache update bit document '+newName+' '+imgUrl+' '+id);
                                            superAgent
                                                .put(config.host + '/api/bit/id/' + id)
                                                .send({'image': newName, 'show': 'true', 'imageSourceUrl': imgUrl})
                                                .end(function (err) {
                                                    if (err) {
                                                        throw err;
                                                    }
                                                    // 6 - delete local file
                                                    log.info('7 getSetCache unlink localImg');
                                                    fs.unlink(localImg, function (err) {
                                                        if (err) {
                                                            throw err;
                                                        }
                                                        log.info('successfully deleted '+localImg);
                                                        return cb(null, imgObj);
                                                    });
                                                });
                                        } // s3 if/else
                                    }); // s3.upload
                                }); // gm.write, part of resize
                        }); // file.on
                    } else {
                        log.err('file write error');
                    }
                });
        }); // getGoogleImageName
    },

    /**
     * Retrieve Google API URL from config values.
     * @param {string} name
     * @returns {string}
     */
    getGoogleApiUrl: function (name) {
        var gs    = config.googleSearchAPI; // url, key, cx
        var gsUrl = gs.url + '&key=' + gs.key + '&cx=' + gs.cx + '&q=' + name;
        return gsUrl;
    },

    /**
     * Run Google Image Search based on passed string.
     * @param {string} name - image name to search for
     * @param {requestCallback} cb - callback method
     * @returns {string} image url
     */
    getGoogleImage: function (name, cb) {
        var self  = this;
        var gsUrl = this.getGoogleApiUrl(name);
        // To test with local results
        // comment out superAgent call and uncomment these:
        //   var result = require('../_test/result.json');
        //   var url = self.parseGoogleResults(result.body);
        //   return cb(null, url);
        superAgent
            .get(gsUrl)
            .end(function (err, result) {
                var url = self.parseGoogleResults(result.body);
                return cb(null, url);
            });
    },

    /**
     * Parse the result object returned by Google Search.
     * @param {object} result
     * @param {object} result.pagemap
     * @param {string} result.pagemap.imageobject
     * @returns {string} one accepted url
     */
    parseGoogleResults: function (result) {
        var items = result.items;
        if (items.length > 0) {
            for (var i = 0; i < items.length; i++) {
                var imgResult = items[i].pagemap.imageobject;
                if ((typeof (imgResult) !== 'undefined') && (typeof (imgResult[0].url) !== 'undefined')) {
                    log.info('imgResult[0].url '+imgResult[0].url);
                    var tmp = imgResult[0].url;
                    if (tmp !== '' && this.checkImageMime(tmp)) {
                        return tmp;
                    } else {
                        log.info('mime return false');
                    }
                }
            }
        }
    },

    /**
     * Make sure passed url of image is valid mime type and ext.
     * @param {string} url
     * @returns {boolean} no cb needed
     */
    checkImageMime: function (url) {
        var imgExt = mime.extension(mime.lookup(url));
        if (config.bitImgAllowedExt.indexOf(imgExt) >= 0) {
            log.info('img ext is allowed');
            return true;
        } else {
            return false;
        }
    }

};
