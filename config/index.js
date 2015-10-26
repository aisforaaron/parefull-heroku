var defaults  = require('./defaults');
var env       = process.env.NODE_ENV || 'development';
var overrides = require('./' + env);

console.log('Config ENV: '+env)

for (var key in overrides) {
    if (overrides.hasOwnProperty(key)) {
        defaults[key] = overrides[key];
    }
}

module.exports = defaults; 
