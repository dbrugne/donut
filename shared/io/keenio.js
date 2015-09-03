'use strict';
var Keen = require('keen-js');
var conf = require('../../config/index');

var client = new Keen({
  projectId: conf.keenio.projectId,
  writeKey: conf.keenio.writeKey
// protocol: "https",              // String (optional: https | http | auto)
// host: "api.keen.io/3.0",        // String (optional)
// requestType: "jsonp"            // String (optional: jsonp, xhr, beacon)
});

module.exports = client;
