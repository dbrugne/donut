if (process.env.NODE_ENV !== 'development')
  require('newrelic');

var pomelo = require('pomelo');
var logger = require('./pomelo-logger').getLogger('donut', __filename);
var scheduler = require('./app/components/scheduler')
var dispatcher = require('./app/util/dispatcher');
var connector = require('./app/connector/sioconnector');
var globalChannel = require('pomelo-globalchannel-plugin');
var status = require('pomelo-status-plugin');
var chatLoggerFilter = require('./app/servers/chat/filter/logger');
var chatParametersFilter = require('./app/servers/chat/filter/parameters');
var connectorLoggerFilter = require('./app/servers/connector/filter/logger');
var pomeloBridge = require('./app/components/bridge');

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'donut');

var socketIoOptions = {
  // @doc: http://socket.io/docs/server-api/#server(opts:object)
  // @doc: https://github.com/Automattic/engine.io#methods-1
};

app.use(globalChannel, {
  globalChannel: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'pomelo:globalchannel',
    cleanOnStartUp: true
  }
});

app.use(status, {status: {
  host: '127.0.0.1',
  port: 6379,
  prefix: 'pomelo:status',
  cleanOnStartUp: true
}});

// app configuration
app.configure('production|test|development', 'connector', function() {

  // filters
  app.before(pomelo.toobusy());
  app.filter(connectorLoggerFilter());

  app.set('connectorConfig',
    {
      connector : connector,
      options   : socketIoOptions
    });
});

var chatRoute = function(session, msg, app, cb) {
  var chatServers = app.getServersByType('chat');
  if(!chatServers || chatServers.length === 0)
    return cb(new Error('can not find chat servers.'));

  var res = dispatcher.dispatch(session.uid, chatServers);
  cb(null, res.id);
};
app.configure('production|test|development', 'chat', function() {
  // route configures
  app.route('chat', chatRoute);

  // filters
  app.before(pomelo.toobusy());
  app.filter(pomelo.timeout());
  app.filter(chatLoggerFilter());
  app.filter(chatParametersFilter());
});

// Scheduler
app.configure('production|test|development', 'master', function() {
  app.load(scheduler, {});
});

// admin modules for all kinds of servers
app.registerAdmin(pomeloBridge.Module, {
  app: app
});

// start app
app.start();

/**
 * uncaughtException handler
 */
process.on('uncaughtException', function(err) {
  try {
    logger.fatal('Uncaught exception: ', err.stack);
  } catch (e) {
    console.error('Uncaught exception: ', err.stack);
  }
});