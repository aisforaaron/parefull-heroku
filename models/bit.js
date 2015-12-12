// Bit schema

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var BitSchema   = new Schema({
    name:       { type: String },
    created:    { type: Date, default: Date.now },
    ip:         { type: String },
    scoreAvg:   { type: Number },
    image:      { type: String },
    imageSourceUrl:  { type: String },
    show:       { type: Boolean, default: false },
});

module.exports = mongoose.model('Bit', BitSchema);
