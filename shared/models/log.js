var mongoose = require('../io/mongoose');
var debug = require('debug')('donut:server:log');

var logSchema = mongoose.Schema({

  timestamp     : { type: Date, default: Date.now },
  category      : String,
  level         : mongoose.Schema.Types.Mixed,
  data          : mongoose.Schema.Types.Mixed

});

module.exports = mongoose.model('Logs', logSchema);