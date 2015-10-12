'use strict';

var pomelo = require('pomelo');
var logger = require('../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var scheduler = require('./app/components/scheduler');
var dispatcher = require('./app/util/dispatcher');
var connector = require('./app/connector/sioconnector');
var globalChannel = require('pomelo-globalchannel-plugin');
var status = require('pomelo-status-plugin');
var loggerFilter = require('./app/util/filter/logger');
var parametersFilter = require('./app/util/filter/parameters');
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

app.use(status, {
  status: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'pomelo:status',
    cleanOnStartUp: true
  }
});

// app configuration
app.configure('production|test|development', 'connector', function () {
  // filters
  app.before(pomelo.toobusy());
  app.filter(loggerFilter());

  app.set('connectorConfig', {
    connector: connector,
    options: socketIoOptions
  });
});

app.configure('production|test|development', 'chat', function () {
  // route configures
  app.route('chat', dispatcher('chat'));

  // filters
  app.before(pomelo.toobusy());
  app.filter(pomelo.timeout());
  app.filter(loggerFilter());
  app.filter(parametersFilter());
});
app.configure('production|test|development', 'history', function () {
  // route configures
  app.route('history', dispatcher('history'));

  // filters
  app.before(pomelo.toobusy());
  app.filter(pomelo.timeout());
  app.filter(loggerFilter());
  app.filter(parametersFilter());
});

// Scheduler
app.configure('production|test|development', 'master', function () {
  app.load(scheduler, {});
});

// admin modules for all kinds of servers
app.registerAdmin(pomeloBridge.Module, {
  app: app
});

// start app
app.start();

process.on('uncaughtException', function (err) {
  try {
    logger.fatal('ws uncaughtException', err.stack);
  } catch (e) {
    console.error('ws uncaughtException (logger failed)', err.stack);
  }
});
