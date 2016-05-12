/**
 * Pareque schema.
 */

var mongoose      = require('mongoose');
var Schema        = mongoose.Schema;
var ParequeSchema = new Schema({
    name: {type: String},
    status: {type: String, default: null},
    created: {type: Date, default: Date.now},
    _bitId: {type: Schema.Types.ObjectId}
});
module.exports    = mongoose.model('Pareque', ParequeSchema);
