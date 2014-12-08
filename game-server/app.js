var debug = require('debug')('donut:server');
var pomelo = require('pomelo');
var dispatcher = require('./app/util/dispatcher');
var connector = require('./app/connector/sioconnector');
var globalChannel = require('pomelo-globalchannel-plugin');
var status = require('pomelo-status-plugin');

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
app.configure('production|development', 'connector', function(){
  app.set('connectorConfig',
    {
      connector : connector,
      options   : socketIoOptions
    });
});

app.configure('production|development', 'gate', function(){
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

  debug('chatRoute call dispatch with '+session.uid);
  var res = dispatcher.dispatch(session.uid, chatServers);

  cb(null, res.id);
};
app.configure('production|development', function() {
  // route configures
  app.route('chat', chatRoute);

  // filter configures
  app.filter(pomelo.timeout());
});

// start app
app.start();

process.on('uncaughtException', function(err) {
  console.error(' Caught exception: ' + err.stack);
});