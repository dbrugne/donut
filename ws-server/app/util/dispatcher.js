'use strict';
var crc = require('crc');

var dispatch = function (key, list) {
  // select an item from list based on key
  var index = Math.abs(crc.crc32(key)) % list.length;
  return list[index];
};

module.exports = function (type) {
  return function (session, msg, app, cb) {
    var servers = app.getServersByType(type);
    if (!servers || !servers.length) {
      return cb(new Error('can\'t find servers of type ' + type));
    }

    var res = dispatch(session.uid, servers);
    cb(null, res.id);
  };
};
