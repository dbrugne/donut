'use strict';
var configuration = require('../util/get-pomelo-configuration')();
var Bridge = require('../../ws-server/app/components/bridge').Bridge;

var client = Bridge({
  masterId: configuration.master.id,
  host: configuration.master.host,
  port: configuration.master.port,
  username: configuration.adminUser[ 0 ].username,
  password: configuration.adminUser[ 0 ].password
});

module.exports = client;
