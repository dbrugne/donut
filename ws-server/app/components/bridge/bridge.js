var debug = require('debug')('donut:pomelo-client');
var _ = require('underscore');
var pomeloAdmin = require('../../../../node_modules/pomelo/node_modules/pomelo-admin/index');
var adminClient = pomeloAdmin.adminClient;

var moduleId = 'pomeloBridge';

/**
 * Allows external programs to communicate with PomeloJS cluster thought PomeloJS administration framework
 *
 * @doc: https://github.com/NetEase/pomelo/wiki/Adding-an-Admin-Module
 */

module.exports = function(options) {
  return new Bridge(options);
};

var Bridge = function(options) {
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
Bridge.prototype.getConnection = function(callback) {
  if (this.client)
    return callback(null, this.client);

  this.connect(_.bind(function(err) {
    if (err)
      return callback(err);

    return callback(null, this.client);
  }, this));
};

/**
 * Establish a connection to cluster master server
 *
 * @source pomelo-admin/lib/client/client.js
 * @param callback
 */
Bridge.prototype.connect = function(callback) {
  this.client = new adminClient({
    username: this.username,
    password: this.password,
    md5: true
  });
  this.client.connect(this.masterId, this.host, this.port, _.bind(callback, this));
};

/**
 * Cleanly disconnect client from master
 */
Bridge.prototype.disconnect = function() {
  if (this.client && this.client.socket && this.client.socket.connected === true)
    this.client.socket.disconnect();

  this.client = null;
};

/**
 * Send a request to pomelo cluster
 *
 * @param target server(s) to transmits the query
 * @param action
 * @param data
 * @param callback
 */
Bridge.prototype.request = function(target, action, data, callback) {
  this.getConnection(_.bind(function(err, client) {
    if (err)
      return callback(err);

    var query = {
      type: 'request',
      target: target,
      action: action,
      data: data
    };
    client.request(moduleId, query, callback);
  }, this));
};

/**
 * Send a notify to pomelo cluster
 *
 * @param target server(s) to transmits the query
 * @param action
 * @param data
 * @param callback
 */
Bridge.prototype.notify = function(target, action, data, callback) {
  this.getConnection(_.bind(function(err, client) {
    if (err)
      return callback(err);

    var query = {
      type: 'notify',
      target: target,
      action: action,
      data: data
    };

    client.notify(moduleId, query);

    callback(null); // allow sequential calls even if on a notify call not response are received
  }, this));
};
