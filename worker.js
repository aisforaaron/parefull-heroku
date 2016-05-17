// Process records in img collection

// This will grab documents from mongo and process to stream images to S3
var superagent = require('superagent');
var imgUtils   = require('./lib/imgUtils.js');
var config     = require('./config');

function tStamp() {
    var d   = new Date();
    var min = d.getMinutes();
    min     = min < 10 ? '0' + min : min; // zerofill
    return d.getHours() + ':' + min;
}

console.log('Worker.js on host', config.host, 'check every ms', config.workerInterval);

// every interval, process one record
setInterval(function () {
    console.log('Worker.js', 'Polling mongo collection for images, flush done items', tStamp());
    // Remove any pareque items with status=done
    superagent
        .get(config.host + '/api/pareque/flush')
        .end(function (err, result) {
            if (err) {
                throw err;
            } else {
                console.log('Worker.js', 'Removed done pareque items', result.ok);
            }
        });
    // 1 - API call for mongo to get one status=pending doc, oldest first
    superagent
        .get(config.host + '/api/pareque/next')
        .end(function (err, result) {
            if (err) {
                throw err;
            }
            if (result.body.name) {
                console.log('Next pareque item:', result.body.name);
                // 2 - send document to getSetCache
                imgUtils.getSetCache(result.body.name, result.body._bitId, function (err, imgObj) {
                    if (err) {
                        throw err;
                    }
                    // 3 - on success, update pareque document
                    if (imgObj) {
                        console.log('worker.js update pareque document', result.body._id);
                        superagent
                            .put(config.host + '/api/pareque/id/' + result.body._id)
                            .send({'status': 'done'})
                            .end(function (err) {
                                if (err) {
                                    throw err;
                                }
                                console.log('Worker.js', 'getSetCache completed');
                            });
                    }
                });
            } else {
                console.log('Worker.js', 'No pending pareque documents.', tStamp());
            }
        });
}, config.workerInterval);
