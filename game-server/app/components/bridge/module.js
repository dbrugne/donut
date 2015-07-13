/**
 * Implement PomeloJS admin-module to listen and pass trough comment from client to cluster servers
 *
 * To:
 * - all: broadcast message to all servers
 * - all:chat|connector: send message only to this kind of servers
 * - chat|connector: send message only to one server of this type
 */
var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var dispatcher = require('../../util/dispatcher');

module.exports = function(opts) {
  return new Module(opts);
};

var moduleId = 'pomeloBridge';
module.exports.moduleId = moduleId;

var Module = function(options) {
  this.options = options;
  this.app     = options.app;

  /**
   * Normally used for monitor purpose, if type is 'pull' a setInterval is set and call master every 'interval' seconds
   * if 'push' the setInterval will call monitor instead of master.
   */
  this.type     = ''; //options.type || 'pull';
  this.interval = options.interval || 5;
};

Module.prototype.start = function(callback) {
  logger.debug(moduleId+' starting on '+this.app.serverId);

  // some specific starting actions

  return callback(null);
};

/**
 * Handle query to other servers (chat, connector...)
 *
 * @param agent @doc: node_modules/pomelo/node_modules/pomelo-admin/lib/monitorAgent.js
 * @param request
 * @param fn
 */
Module.prototype.monitorHandler = function(agent, request, fn) {
  // avoid PomeloJS warning when calling callback (fn is always set as a Function) on notify call
  var callback = (request.type === 'request' && _.isFunction(fn))
    ? fn
    : function(err, result) {
    if (err)
      return logger.error(err);
    return logger.debug(result);
  };

  if (request.action == 'ping')
    return callback(null, 'pong');

  // @todo : implement actions
  //this.app.get('globalChannelService').pushMessage('connector', 'hello', request.type, 'global', {}, callback);

  return callback('Unable to identify action to run on '+this.app.serverId);
};

/**
 * Master request handling, called by clientHandler()
 *
 * @param agent (@doc: node_modules/pomelo/node_modules/pomelo-admin/lib/masterAgent.js)
 * @param request
 * @param callback
 */
Module.prototype.masterRequest = function(agent, request, callback) {

  if (request.action == 'ping')
    return callback(null, 'pong');

  // @todo : implement actions
  //this.app.get('globalChannelService').pushMessage('connector', 'hello', request.type, 'global', {}, callback);

  //return callback('Unable to identify action to run on '+this.app.serverId);
};

/**
 * Master notify handling, called by clientHandler()
 *
 * @param agent (@doc: node_modules/pomelo/node_modules/pomelo-admin/lib/masterAgent.js)
 * @param request
 */
Module.prototype.masterNotify = function(agent, request) {

  if (request.action == 'ping')
    return logger.info('pong');

  // @todo : implement actions
  //this.app.get('globalChannelService').pushMessage('connector', 'hello', request.type, 'global', {}, callback);

  return logger.info('Unable to identify action to run on '+this.app.serverId);
};

/**
 * Find and return a server (randomly) in list
 *
 * @param list Array
 */
Module.prototype.dispatch = function(list) {
  return dispatcher.dispatch(Math.floor(Math.random() * 10), list);
};

/**
 * Bridge entry-point, could works as notify (without callback) or request handler
 *
 * @param agent
 * @param query
 * @param fn
 */
Module.prototype.clientHandler = function(agent, query, fn) {
  logger.debug(moduleId+' client query on '+this.app.getServerId()+': '+JSON.stringify(query));

  // avoid PomeloJS warning when calling callback (fn is always set as a Function) on notify call
  var callback = (query.type === 'request' && _.isFunction(fn))
    ? fn
    : function(err) {
    if (err)
      logger.error(err);
  };

  if (!query || !_.isObject(query))
    return callback('query should be an object');
  if (!query.type)
    return callback('query should contains a type parameter');
  if (!query.target)
    return callback('query should contains a target parameter');
  if (!query.action)
    return callback('query should contains an action parameter');

  switch (query.target) {
    case 'master':
      // i'm already on the master
      if (query.type === 'request')
        this.masterRequest(agent, query, callback);
      else
        this.masterNotify(agent, query);
      break;
    case 'connector':
    case 'chat':
      var server = this.dispatch(agent.typeMap[query.target]);
      if (query.type === 'request')
        agent.request(server.id, moduleId, query, callback);
      else
        agent.notifyById(server.id, moduleId, query);
      break;

    default:
      return callback('Unable to find the server corresponding to target parameter: '+query.target);
  };
};

