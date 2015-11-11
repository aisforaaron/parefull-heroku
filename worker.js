// Worker script for Kue
// This will grab items already on the queue and process them. 
var superagent = require('superagent');
var imgUtils   = require('./lib/imgUtils.js');
var google     = require('google-images')
var kue        = require('kue')
var queue      = kue.createQueue()

console.log('Worker.js')

setInterval(function (){
    console.log('Worker.js', 'Polling queue', new Date().getTime())
    // process jobs in que in the consumer
    queue.process('googleImage', function (job, done){
        console.log('Worker.js', 'Processing', job.data.name)
        // get new img, save to S3
        imgUtils.getSetCache(job.data.name, function(err, imgName){
            if(err) throw err
            // PUT call to update bit
            superagent
              .put('/api/bit/id/'+job.data.id)
              .send({'image': imgName, 'queue': false})
              .end(function (err, result) {
                if(err) throw err
              })
        })
        done && done()
    })
}, 5000)
