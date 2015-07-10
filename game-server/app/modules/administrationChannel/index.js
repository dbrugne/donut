/**
 * Implement listener/caller on WS process to allow action triggering from outside of pomelo
 *
 * Master is the master, each chat server is a monitor
 * Instead of using the pomelo admin module client procedure we base our 'inter-process-communication' on Redis
 */
var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var redis = require('redis');

module.exports = function(opts) {
  return new Module(opts);
};

var moduleId = "administrationChannel";
module.exports.moduleId = moduleId;

var Module = function(options) {
  this.options = options;
  this.app     = options.app;
  this.host    = options.host || '127.0.0.1';
  this.port    = options.port || 6379;
  this.db      = options.db || '0';
  this.channel = 'donut:administration:channel';

  /**
   * This option are normally used for monitor purpose. In fact they command the module handlers executions:
   * - type: will indicate if this is the MASTER or the MONITOR handler that will be fired every 'interval' seconds
   *   - pull: fire master
   *   - push: fire monitor
   */
  this.type     = ''; //options.type || 'pull';
  this.interval = options.interval || 5;
};

Module.prototype.start = function(cb) {
  logger.debug(moduleId+' starting');

  // open redis and subscribe
  this.redis = redis.createClient(this.port, this.host, this.options);
  if (this.options.auth_pass)
    this.redis.auth(this.options.auth_pass);

  this.redis.on('error', function (err) {
    logger.error('[redis-error] '+err.stack);
  });

  this.redis.on('message', _.bind(function (channel, message) {
    logger.debug(moduleId+' receive message on '+channel);

    if (channel == this.channel)
      console.log(message);
  }, this));

  this.redis.once('ready', _.bind(function(err) {
    if (!!err)
      return cb('[redis-error] '+err);

    this.redis.select(this.db, _.bind(function(err) {
      if (err)
        return cb('[redis-error] '+err);

      this.redis.subscribe(this.channel);

      logger.debug(moduleId+' succefully started');
      return cb(null);
    }, this));
  }, this));

};

Module.prototype.stop = function(cb) {
  console.log('STOOOOOOOOOOOOOOOOOOOOP!!!');
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

