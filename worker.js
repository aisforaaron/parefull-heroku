// Process records in img collection
// This will grab documents from mongo and process to stream images to S3
var superagent = require('superagent');
var imgUtils   = require('./lib/imgUtils.js');
var config     = require('./config');

function tStamp(){
    var d   = new Date()
    var min = d.getMinutes()
    min     = min < 10 ? '0'+min : min // zerofill 
    return d.getHours()+':'+min
}

console.log('Worker.js')
// testing
superagent
.get('parefull-staging.herokuapp.com/api/bit/count')
.end(function (err, res) {
   if(err) throw err
   console.log('Worker.js count test', res)
})
/*
// testing pareque api
superagent
  .get('/api/pareque/test') // get next item to process 
  .end(function (err, result) {
    if(err) throw err
    console.log('Worker.js /test path result', result)
  })

// every interval, process one record
setInterval(function (){
    console.log('Worker.js', 'Polling mongo collection for images', tStamp())
    // 1 - API call for mongo query to get one document, status=pending, sort asc (oldest first)
    superagent
      .get('/api/pareque/next') // get next item to process 
      .end(function (err, result) {
        if(err) throw err
        if(result.body.name) {
            console.log('Next pareque item:', result.body.name)
            // 2 - send document to getSetCache
            imgUtils.getSetCache(result.body.name, result.body._bitId, function(err, imgObj){
                if(err) throw err
                // 3 - on success, update document 
                if(imgObj){
                    console.log('worker.js update pareque document', result.body._id)
                    superagent
                      .put('/api/pareque/id/'+result.body._id) // get next item to process 
                      .send({'status': 'done'})
                      .end(function (err, result) {
                        if(err) throw err
                        console.log('Worker.js', 'getSetCache completed')
                      })
                }
            })
        } else {
            console.log('Worker.js', 'No pending pareque documents.', tStamp())
        }
    })
}, process.env.APP_WORKER_INTERVAL)
*/
