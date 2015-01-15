var mongoose = require('../io/mongoose');
var debug = require('debug')('donut:server:log');
var logger = require('pomelo-logger').getLogger('donut');

var logSchema = mongoose.Schema({

  type            : String,
  uid             : { type: mongoose.Schema.ObjectId, ref: 'User' },
  data            : String,
  time            : { type: Date, default: Date.now },
  duration        : Number

});

logSchema.statics.start = function() {
  return new Date().getTime();
};

/**
 * Record an activity (a user action on the donut platform) item
 *
 * @param type
 * @param uid
 * @param data
 * @param start
 */
logSchema.statics.activity = function(type, uid, data, start) {
  var log = this.record(type, uid, data, start);
  logger.info(log);
};
logSchema.statics.record = function(type, uid, data, start) {
  // duration
  var duration;
  if (start) {
    duration = (new Date().getTime() - start);
  }

  // prepare model
  var model = new this();
  model.type      = type;
  model.uid       = uid;
  model.data      = data;
  model.time      = new Date();
  if (typeof duration != "undefined")
    model.duration = duration;

  // persist
  model.save(function(err) {
    if (err)
      return logger.error('Unable to save log record "'+model.type+'" for "'+model.uid+'"');
  });

  // log on console
  var log = "'"+model.uid+"' has '"+model.type+"'";
  if (data)
    log += " on/with "+data;
  if (start) {
    log += " (in "+duration+"ms)";
  }
  return log;
};

module.exports = mongoose.model('Log', logSchema);