// Process records in img collection

// This will grab documents from mongo and process to stream images to S3
var superagent = require('superagent');
var config     = require('./config');
var imgUtils   = require('./lib/imgUtils.js');
var pareUtils  = require('./lib/utils.js');
var bunyan     = require('bunyan');
var log        = pareUtils.setupLogging('parefull', true, config.logging.parefull);

function tStamp() {
    var d   = new Date();
    var min = d.getMinutes();
    min     = min < 10 ? '0' + min : min; // zerofill
    return d.getHours() + ':' + min;
}

log.info('Worker.js on host '+config.host+' check every ms '+config.workerInterval);

// every interval, process one record
setInterval(function () {
    log.info('Worker.js - Polling mongo collection for images, flush done items '+tStamp());
    // Remove any pareque items with status=done
    superagent
        .get(config.host + '/api/pareque/flush')
        .end(function (err, result) {
            if (err) {
                throw err;
            } else {
                log.info('Worker.js - Removed done pareque items '+result.ok);
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
                log.info('Next pareque item: '+result.body.name);
                // 2 - send document to getSetCache
                imgUtils.getSetCache(result.body.name, result.body._bitId, function (err, imgObj) {
                    if (err) {
                        throw err;
                    }
                    // 3 - on success, update pareque document
                    if (imgObj) {
                        log.info('Worker.js update pareque document '+result.body._id);
                        superagent
                            .put(config.host+'/api/pareque/id/'+result.body._id)
                            .send({'status': 'done'})
                            .end(function (err) {
                                if (err) {
                                    throw err;
                                }
                                log.info('Worker.js - getSetCache completed');
                            });
                    }
                });
            } else {
                log.info('Worker.js - No pending pareque documents. '+tStamp());
            }
        });
}, config.workerInterval);
