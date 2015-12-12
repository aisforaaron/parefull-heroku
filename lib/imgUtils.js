// Parefull utililty methods for Image Management

var superagent  = require('superagent');
var fs          = require('fs');
var request     = require('request');
var config      = require('../config');
var AWS         = require('aws-sdk');
var mime        = require('mime');

module.exports = {

  // add new job to pareque mongo collection
  newJob: function (id, name) {
    console.log('newJob', id, name)
      name = name || 'Default_Name'
      superagent
        .post('/api/pareque')
        .send({'name': name, '_bitId': id, 'status': 'pending'})
        .end(function (err, result) {
          if(err) throw err
          console.log('newJob added to pareque', name, id)
        })
  },

  // pass remote image url and save to S3 bits dir
  // @todo rename img to bitId? 
  streamToBucket: function (imgUrl, imgName, cb) {
    console.log('streamtoBucket start')
    var s3      = new AWS.S3();
    var options = {'uri': imgUrl, 'encoding': null}
    console.log('streamtoBucket', 'options', options)
    request
      .get(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var params = {
            Bucket:      'parebits',           // @todo move to config obj
            Body:         body, 
            Key:          'bits/'+config.env+'/'+imgName,
            ContentType:  mime.lookup(imgUrl), //this work right remotely? 
            ACL:         'public-read'
          }
          console.log('streamtoBucket', 'params', params)
          s3.upload(params, function(err, data) {
            if(err){
              throw err
              console.log('streamtoBucket errors', err, data);
            } else {
              return cb(null, data)
            }
          });
        }
      });
  },

  // wrapper method to call all image methods here
  // @return json obj of original remote url and new image filename
  getSetCache: function (name, id, cb) {
      console.log('getSetCache', 'start', new Date().getTime())
      var self = this
      this.getGoogleImage(name, false, function(err, imgUrl){ // second param id dev, set true when testing locally
          if(err) throw err
          console.log('getSetCache', imgUrl)
          // @todo move this to a method
          // regex will remove anything not alpha
          // prepend the last 6 chars of the objectId
          // var name = '   The "best" Im@g name_&777   ' // turns into thebestimgname
          var nameStr = name.replace(/[^a-zA-Z]|_/g, "").replace(/\s+/g, " ").toLowerCase()
          var imgExt  = mime.extension(mime.lookup(imgUrl))
          var idPart  = id.slice(-6)
          var newName = idPart+'-'+nameStr+'.'+imgExt
          var imgObj  = {name: newName, source: imgUrl}
          console.log('getSetCache', 'right before streamtoBucket.')
          // Save to S3 instead of caching locally
          self.streamToBucket(imgUrl, newName, function(err, res){
              if(err) throw err
              // PUT call to update bit - testing out putting this here instead of in worker
              // return cb(null, imgObj) // uncomment when testing locally
              // comment out when testing local json
              console.log('getSetCache update bit', newName, imgUrl, id)
              superagent
                // .put('parefull-staging.herokuapp.com/api/bit/id/'+id) // testing on staging needs full url??
                .put('/api/bit/id/'+id)
                .send({'image': newName, 'show': 'true', 'imageSourceUrl': imgUrl})
                .end(function (err, result) {
                  if(err) throw err
                  return cb(null, imgObj)
                })
          })
      })
  },

  getImageFileName: function (url, cb) {
    if(url.length>0) {
      var str = url.substring(url.lastIndexOf('/')+1)
      return cb(null, str);
    }
  },

  // options = extra key/value options to pass into search url (var not working yet)
  getGoogleApiUrl: function(name, options) {
      var gs    = config.googleSearchAPI  // url, key, cx
      var gsUrl = gs.url + '&key='+gs.key + '&cx='+gs.cx + '&q='+name
      // Apply extra parameters passed from 'options' param
      var gsCount = 0
      for (var key in options) {
          if(gsCount>0) gsUrl += '&'
          gsCount++
          gsUrl += key + '=' + options[key] // &key=value
      }
      return gsUrl
  },

  // @return new image url
  getGoogleImage: function  (name, dev, cb) {
    var self = this
    if(dev==false) {
        var gsUrl = this.getGoogleApiUrl(name)
        superagent
        .get(gsUrl)
        .end(function (err, result) {
            var url = self.parseGoogleResults(result.body)
            return cb(null, url)
        })
    } else { 
      var result = require('../_test/result.json') // full response example
      var url    = this.parseGoogleResults(result)
      return cb(null, url)
    }
  },

  // @return one accepted url
  parseGoogleResults: function (result) {
    var urls   = []
    var items  = result.items
    if(items.length>0) {
      for (i=0; i<items.length; i++) {
          var imgResult = items[i].pagemap.imageobject
          if ( (typeof(imgResult)!="undefined") && (typeof(imgResult[0].url)!="undefined") ) {
            console.log('imgResult[0].url', imgResult[0].url)
            var tmp = imgResult[0].url
            if(tmp!='' && this.checkImageMime(tmp)) {
              //urls.push(tmp)
              return tmp // just return first ok url
            } else {
              console.log('mime return false')
            }
          }
      }
    }
  },

  // make sure passed url of image is valid mime type and ext
  // @return bool, no cb needed
  checkImageMime: function (url) {
    console.log('checkImageMime', url)
    var imgTypes   = ['image/jpeg', 'image/png']
    var allowedExt = ['jpeg', 'png', 'jpg']
    var imgExt     = mime.extension(mime.lookup(url))
    console.log('imgExt', imgExt)
    if(allowedExt.indexOf(imgExt)>=0){
      console.log('ext is allowed')
      return true
      // this isn't working right now...not sure why
      /*
      request
      .get(url)
      .on('response', function(resp) {
          console.log('mime on response')
          var mime     = resp.headers['content-type'] // @todo use diff var than mime? this is used as a req lib
          var fileName = url.substring(url.lastIndexOf('/')+1)
          if((imgTypes.indexOf(mime)>=0) && (resp.statusCode==200)) {
              console.log('mime is true')
              return true
          } else {
              console.log('mime is false')
              return false
          }
      })
      */
    } else { // this here just until top code works
      return false
    }
  },

  // @return bool
  cacheGoogleImage: function  (url, savePath, cb) {
      request
        .get(url)
        .on('response', function(resp) {
          // check if img is valid and save locally
          // need to match on mime type 
          // since any html 404 default page will show 200 unless site throws 404 on purpose
          var mime     = resp.headers['content-type']
          var imgTypes = ['image/jpeg', 'image/png']
          var fileName = url.substring(url.lastIndexOf('/')+1)
          if((imgTypes.indexOf(mime)>=0) && (resp.statusCode==200)) {
            // create dir if not exist
            if(!fs.existsSync(savePath)) {
              fs.mkdirSync(savePath);
            }  
            // write file to dir
            resp.pipe(fs.createWriteStream(savePath+fileName))
            return cb(null, true)
          } else {
            // save shrug here? set to false?
            return cb(null, false)
          }
        });
  }

};
