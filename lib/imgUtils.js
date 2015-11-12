// Parefull utililty methods for Image Management

var superagent  = require('superagent');
var google      = require('google-images');
var fs          = require('fs');
var request     = require('request');
var config      = require('../config');
var AWS         = require('aws-sdk');
var mime        = require('mime');
var kue         = require('kue');
var jobs        = kue.createQueue({redis: config.redis.url});

module.exports = {

  // add jobs to que
  // @todo move this into new kue/queue lib?
  // @todo change queue name to a var, this way any job can be sent here first?
  newJob: function (id, name) {
      name    = name || 'Default_Name'
      var job = jobs.create('googleImage', {id: id, name: name})
                    .removeOnComplete(true)
                    .on('progress', function (progress, data) {
                        console.log('Job', job.id, 'progress', progress, 'with data', data)
                    })
                    .on('complete', function (){
                        console.log('Job', job.id, 'with name', job.data.name, 'is done')
                    })
                    .on('failed', function (){
                        console.log('Job', job.id, 'with name', job.data.name, 'has failed')
                    })
                    .save()
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
      var self = this
      this.getGoogleImage(name, function(err, imgUrl){
          if(err) throw err
          // @todo move this to a method
          // remove anything not alpha
          // prepend the last 6 chars of the objectId
          // var name = '   The "best" Im@g name_&777   ' // turns into thebestimgname
          var nameStr = name.replace(/[^a-zA-Z]|_/g, "").replace(/\s+/g, " ").toLowerCase()
          var imgExt  = mime.extension(mime.lookup(imgUrl))
          var idPart  = id.slice(-6)
          var newName = idPart+'-'+nameStr+'.'+imgExt
          var imgObj  = {name: newName, source: imgUrl}
          console.log('getSetCache', 'right before streamtoBucket. return will be', imgObj)
          // Save to S3 instead of caching locally
          self.streamToBucket(imgUrl, newName, function(err, res){
              if(err) throw err

              // PUT call to update bit - testing out putting this here instead of in worker
              var bitObj = {'image': newName, 'queue': 'false', 'imageSourceUrl': imgUrl}
              superagent
                .put('parefull-staging.herokuapp.com/api/bit/id/'+id)
                .send(bitObj)
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

  // @return new image url
  getGoogleImage: function  (name, cb) {
    var imgOptions = name+'&imgsz=small&safe=active'
    var url        = ''  // external image url
    var w          = 0   // width of image
    google.search(imgOptions, function (err, images) {
        // loop through result set for smallest img
        if(images.length>0) {
          for (var img in images) {
              // type cast to numbers for comparison
              var tempW = Number(images[img]['width'])
              // set temp on first run
              if(w==0){
                w   = tempW
                url = images[img]['url']
              } 
              if(tempW < w){
                w   = tempW
                url = images[img]['url']
              }
          }
          return cb(null, url);
        }
    });
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
