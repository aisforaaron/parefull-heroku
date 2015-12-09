// Worker script for Kue
// This will grab items already on the queue and process them. 
var superagent = require('superagent');
var imgUtils   = require('./lib/imgUtils.js');
var kue        = require('kue')
var config     = require('./config');
var queue      = kue.createQueue({redis: config.redis.url});

console.log('Worker.js')

setInterval(function (){
    console.log('Worker.js', 'Polling queue', new Date().getTime())
    // process jobs in que in the consumer
    queue.process('googleImage', function (job, done){
        console.log('Worker.js', 'Processing', job.data.name)
        // get new img, save to S3
        imgUtils.getSetCache(job.data.name, job.data.id, function(err, imgObj){
            if(err) throw err
            console.log('Worker.js', 'getSetCache completed', imgObj)
            // console.log('Worker.js', 'id', job.data.id)
            // var bitObj = {'image': imgObj.name, 'queue': 'false', 'imageSourceUrl': imgObj.source}
            // console.log('Worker.js', 'bitObj', bitObj)
            // PUT call to update bit - moved to getSetCache for now
            // superagent
            //   .put('/api/bit/id/'+job.data.id)
            //   .send(bitObj)
            //   .end(function (err, result) {
            //     if(err) throw err
            //     done && done()
            //   })
            done && done()
        })
    })
}, 5000)
