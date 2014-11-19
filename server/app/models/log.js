var mongoose = require('../mongoose');
var debug = require('debug')('donut:server:ws');

var logSchema = mongoose.Schema({

  type            : String,
  username        : String,
  data            : String,
  time            : { type: Date, default: Date.now }

});

logSchema.statics.log = function(type, username, data) {
  // prepare model
  var model = new this();
  model.type      = type;
  model.username  = username;
  model.data      = data;
  model.time      = new Date();

  // log on console
  var log = "'"+model.username+"' has '"+model.type+"'";
  if (data)
    log += " on/with "+data;
  debug(log);

  // persist
  model.save(function(err) {
    if (err)
      return debug('Unable to save log record "'+model.type+'" for "'+model.username+'"');
  });
};


module.exports = mongoose.model('Log', logSchema);