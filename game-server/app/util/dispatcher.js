var debug = require('debug')('donut:server:dispatch');
var crc = require('crc');

// select an item from list based on key
module.exports.dispatch = function(key, list) {
	debug('dispatcher called with key: '+key);
	var index = Math.abs(crc.crc32(key)) % list.length;
	return list[index];
};
