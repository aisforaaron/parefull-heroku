/**
 * Pareque schema.
 */

var mongoose      = require('mongoose');
var Schema        = mongoose.Schema;
var ParequeSchema = new Schema({
    name: {type: String},
    status: {type: String, default: null}, // null, pending, done, error, skip
    created: {type: Date, default: Date.now},
    _bitId: {type: Schema.Types.ObjectId},      // to reference Bit._id
});
module.exports    = mongoose.model('Pareque', ParequeSchema);
