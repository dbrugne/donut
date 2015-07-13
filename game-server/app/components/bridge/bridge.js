var debug = require('debug')('donut:pomelo-client');
var _ = require('underscore');
var pomeloAdmin = require('../../../../node_modules/pomelo/node_modules/pomelo-admin/index');
var adminClient = pomeloAdmin.adminClient;

/**
 * Lib that allows external program to communicate with a Pomelo cluster thought PomeloJS administration framework
 *
 * @doc: https://github.com/NetEase/pomelo/wiki/Adding-an-Admin-Module
 * @source: pomelo-admin/lib/client/client.js
 */

module.exports = function(options) {
  return new PomeloClient(options);
};

var PomeloClient = function(options) {
  this.options = options;
  this.username  = options.username || 'admin';
  this.password  = options.password || 'admin';
  this.masterId  = options.masterId || 'master-server-1';
  this.host      = options.host || '127.0.0.1';
  this.port      = options.port || 3005;

  this.client = null;
};

/**
 * Return a valid connection to cluster master server
 *
 * @param callback
 */
PomeloClient.prototype.getConnection = function(callback) {
  if (this.client)
    return callback(null, this.client);

  this.connect(_.bind(function(err, client) {
    if (err)
      return callback(err);

    this.client = client;
    return callback(null, client);
  }, this));
};

/**
 * Establish a connection to cluster master server
 *
 * @param callback
 */
PomeloClient.prototype.connect = function(callback) {
  var client = new adminClient({username: this.username, password: this.password, md5: true});
  client.connect(this.masterId, this.host, this.port, _.bind(callback, this));
};

/**
 * Cleanly disconnect client from master
 */
PomeloClient.prototype.disconnect = function() {
  if (this.client && this.client.socket)
    this.client.socket.disconnect();
};

/**
 * Send a request to pomelo cluster master
 *
 * @param moduleId
 * @param data
 * @param callback
 */
PomeloClient.prototype.request = function(moduleId, data, callback) {
  this.getConnection(_.bind(function(err, client) {
    if (err)
      return callback(err);

    client.request(moduleId, data, callback);
  }, this));
};

/**
 * Send a notify to pomelo cluster master
 *
 * @param moduleId
 * @param data
 */
PomeloClient.prototype.notify = function(moduleId, data) {
  this.getConnection(_.bind(function(err, client) {
    if (err)
      return logger.error(err);

    client.notify(moduleId, data);
  }, this));
};
