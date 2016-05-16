/**
 * Score Schema.
 */

var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;
var ScoreSchema = new Schema({
    score: {type: Number, min: 1, max: 10},
    created: {type: Date, default: Date.now},
    _bitId: {type: Schema.Types.ObjectId, ref: 'Bit'},
    ip: {type: String}
});
module.exports  = mongoose.model('Score', ScoreSchema);
