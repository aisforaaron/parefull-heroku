/* 
***************************************
Parefull utililty methods for Image Management

Image Flow
  - add bit will run getGoogleImage, cacheGoogleImage and PUT to update bit w/image filename
  - getting random bit will run getCachedImagePath, if false then getGoogleImage + cacheGoogleImage then getCachedImagePath
  - @todo - flushing cache

S3 Bucket Image Flow
  - 

Image methods
  getGoogleImage      - get a new image from Google results, return url
  cacheGoogleImage    - pass working image url and save to cache dir
  updateBitImage      - update bit document with new image info, pass image url and bitId???
  getCachedImagePath  - pass url string, returns local path to cached image
  flushImageCache     - rm all locally stored bit imgs, update mongo docs to empty image field values
  getImage            - original method to get rand google image url, returns string
*************************************** 
*/

var superagent  = require('superagent');
var google      = require('google-images');
var fs          = require('fs');
var request     = require('request');
var config      = require('../config');
var AWS         = require('aws-sdk');
var mime        = require('mime');


module.exports = {

  // pass remote image url and save to S3 bits dir
  // @todo rename img to bitId? 
  streamToBucket: function (imgUrl, imgName, cb) {
    console.log('streamtoBucket start')
    var s3      = new AWS.S3();
    var options = {'uri': imgUrl, 'encoding': null}
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
          s3.upload(params, function(err, data) {
            if(err){
              throw err
              console.log(err, data);
            } else {
              return cb(null, data)
            }
          });
        }
      });
  },


  // wrapper method to call all image methods here
  // @return string of image filename
  getSetCache: function (name, id, cb) {
    var self = this
    var bitImg = ''
        // get rand google image url
        this.getGoogleImage(name, function(err, res){
          if(err) throw err;
          var imgUrl   = res
          // get filename from end of url
          // -------------------------------------------
          self.getImageFileName(imgUrl, function(err, res){
              if(err) throw err;
              var imgName = res
              // var savePath = self.getCachedImagePath(imgName, false)
              // pass url to cache the image locally
              // if true update bit document
              // -------------------------------------------
              // self.cacheGoogleImage(imgUrl, savePath, function(err, res){
              //   if(err) throw err;
              //
              // Save to S3 instead of caching locally
              self.streamToBucket(imgUrl, imgName, function(err, res){
                if(err) throw err;
                // PUT call to update bit image in db
                // -------------------------------------------
                console.log('right before update image in db, '+imgName)
                superagent
                  .put('/api/bit/id/'+id)
                  .send({"image": imgName})
                  .end(function (err, result) {
                    if(err) throw err;
                    return imgName // return image name
                }); // end id/id
              }); // end cacheGoogleImage - streamtoBucket now
          }); // end getImageFileName
        }); // end getGoogleImage
  },

  getImageFileName: function (url, cb) {
    if(url.length>0) {
      var str = url.substring(url.lastIndexOf('/')+1)
      return cb(null, str);
    }
  },

  // @return new image url
  getGoogleImage: function  (name, cb) {
    console.log('getGoogleImage for '+name)
    // options for image results
    // https://developers.google.com/image-search/v1/jsondevguide?hl=en
    // Options to test
    //    as_rights=cc_publicdomain   - public domain labeled images
    //    restrict=cc_attribute       - restricts results to Creative Commons-attributed images
    //    userip=192.168.0.1          - app may be less likely labeled abusive from Google
    //    safe=active                 - enables the highest level of safe search filtering
    var imgOptions = name+'&imgsz=small&safe=active'
    var url        = ''  // external image url
    var w          = 0   // width of image
    google.search(imgOptions, function (err, images) {
        console.log('inside search')
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
          console.log('getGoogleImage: '+w+'px for '+url)
          return cb(null, url);
        }
    });
  },

  // @return bool
  cacheGoogleImage: function  (url, savePath, cb) {
      console.log('inside cacheGoogleImage')
      request
        .get(url)
        .on('response', function(resp) {
          // check if img is valid and save locally
          // need to match on mime type 
          // since any html 404 default page will show 200 unless site throws 404 on purpose
          var mime     = resp.headers['content-type']
          var imgTypes = ['image/jpeg', 'image/png']
          // this.getImageFileName(url, function(err, res){
          //   var fileName = res
          // })
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
  },

  // @imgName string filename.ext of image
  // @display bool if true, omit 'docroot' in path
  // @return local save path + new or existing cache subdir
  getCachedImagePath: function (imgName, display) {
    console.log('inside getCachedImagePath for '+imgName)

    // new method using S3 - no subdirs yet
    return config.bitFilePath
    /*
    var subdir   = imgName.substring(0, 2)
    var bitPath  = config.bitFilePath
    if(display){
      bitPath = bitPath.substring(8) // docroot/
    }
    var fullPath = bitPath+subdir+'/'
    console.log('fullPath '+fullPath)
    return fullPath;
    */
  },

  // original model
  getImage: function  (name, id, cb) {
    // get rand google image
    // setup options to pass, start with search term then append &name=value pairs
    var imgOptions = name+'&imgsz=small&safe=active' // restrict=cc_attribute'
    google.search(imgOptions, function (err, images) {
        var small = ''
        var temp  = ''
        // loop through and get smallest img by width
        // make sure at least one result
        if(images.length>0) {
          temp = images[0]['width']
          small = images[0]['url']
          console.log('inside images. temp: '+temp)
          for (var img in images) {
              if(images[img]['width']<temp){
                temp  = images[img]['width']
                small = images[img]['url']
              }
          }
          // make sure above logic worked, if not just use shrug image
          if(small.length<1 || temp>400){
            // console.log('set shrug')
            small = '/assets/images/shrug.jpg'
          }
        } else {
          small = '/assets/images/shrug.jpg'
        }
        console.log('return small: '+small)
      return cb(null, small)
    });
  }

};
