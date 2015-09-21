var _ = require('underscore');
var debug = require('debug');

window.dd = debug; // @debug

var times = {};

var donutDebug = function (namespace) {
  var dbg = debug(namespace);

  if (debug.enabled(namespace)) {
    dbg.start = function (name) {
      if (this.isOn === true)
        times[name] = Date.now();
    };
    dbg.end = function (name) {
      if (this.isOn !== true)
        return;

      if (!_.has(times, name))
        return;

      var end = Date.now();
      var start = times[name];
      this("[profiling] Duration of '" + name + "': " + (end - start) + 'ms');
      delete times[name];
    };
  } else {
    dbg.start = function () {};
    dbg.end = function () {};
  }

  return dbg;
};


module.exports = donutDebug;