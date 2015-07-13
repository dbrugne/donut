/**
 * Implement PomeloJS admin-module to listen and pass trough comment from client to cluster servers
 *
 * Could receive this kind of event:
 * - notify: send message without callback
 * - request: send message with callback
 *
 * To:
 * - all: broadcast message to all servers
 * - all:chat|connector: send message only to this kind of servers
 * - chat|connector: send message only to one server of this type
 */
var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');

module.exports = function(opts) {
  return new Module(opts);
};

var moduleId = "administrationChannel";
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

Module.prototype.start = function(cb) {
  logger.debug(moduleId+' starting');

  // some specific starting actions
};

Module.prototype.stop = function(cb) {
  console.log('STOOOOOOOOOOOOOOOOOOOOP!!! Test if fired');
};

/**
 *
 * @param agent @doc: node_modules/pomelo/node_modules/pomelo-admin/lib/monitorAgent.js
 * @param msg
 * @param cb
 * @returns {*}
 */
Module.prototype.monitorHandler = function(agent, msg, cb) {
  console.log('MONITOR RECEIVE ('+this.app.getServerId()+'): '+msg);
  //var serverId = agent.id;
  //var time = new Date(). toString();
//
  //agent.notify(moduleId, {serverId: serverId, time: time});
  this.app.get('globalChannelService').pushMessage('connector', 'hello', {truc:'ahahah'}, 'global', {}, function(err) {
    return cb(err, 'bien reçu José: '+JSON.stringify(msg));
  });

};

/**
 *
 * @param agent @doc: node_modules/pomelo/node_modules/pomelo-admin/lib/masterAgent.js
 * @param msg
 */
Module.prototype.masterHandler = function(agent, msg, cb) {
  if(!msg) {
    agent.notifyAll(moduleId, 'NOTIFY FROM MASTER IN CASE OF NO MESSAGE');
    return;
  }

  console.log('MASTER RECEIVE ', msg);
  var timeData = agent.get(moduleId);
  if(! timeData) {
    timeData = {};
    agent.set(moduleId, timeData);
  }
  timeData[msg.serverId] = msg.time;
};

Module.prototype.clientHandler = function(agent, request, callback) {
  logger.debug('client request on '+this.app.getServerId()+': '+JSON.stringify(request));
  if (!request || !_.isObject(request) || !request.event)
    return callback('second parameter should be an object: { event: String }');

  switch (request.event) {
    case 'ping':
      return callback(null, 'pong');
      break;

    case 'hello':
      var dispatcher = require('../../../app/util/dispatcher');
      var res = dispatcher.dispatch(Math.floor(Math.random() * 10), agent.typeMap['chat']);
      agent.request(res.id, moduleId, {'name': 'josé'}, function(err, result) {
        console.log('!!'+err);
        console.log('!!'+result);
        return callback(err, result);
      });
      break;

    case 'broadcastToAll':
      this.app.get('globalChannelService').pushMessage('connector', 'hello', request.type, 'global', {}, callback);
      break;

    default:
      return callback('Unable to find the event corresponding to: '+request.event);
  }
};

