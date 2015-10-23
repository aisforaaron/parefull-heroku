// Bit schema

// Schema strategy is to relate votes to a bit using  _bitID == Bit._id 
// - group votes by item
// - get avg of vote scores
// - try to use IP to limit the same user from voting multiple times on one bit
// - if i delete a bit, i'll need to delete all scores as well

// @todo separate vote schema to diff model?

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var BitSchema   = new Schema({
    name: { type: String },
    created: { type: Date, default: Date.now },
    ip: { type: String },
    scoreAvg: { type: Number }
});

module.exports = mongoose.model('Bit', BitSchema);
