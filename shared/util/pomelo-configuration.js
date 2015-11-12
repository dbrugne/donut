var path = require('path');

module.exports = function () {
  var env = process.env.NODE_ENV || 'development';
  var basePath = path.join(__dirname, '../..', 'ws-server/config');
  var configuration = {};

  // master config
  var masterConfig = require(basePath + '/master');
  configuration.master = masterConfig[env];

  // admin config
  configuration.adminUser = require(basePath + '/adminUser');

  return configuration;
};
