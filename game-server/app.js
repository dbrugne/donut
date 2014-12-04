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
  // http://socket.io/docs/server-api/#server(opts:object)
  //serveClient: false, // If true the attached server will serve the client files. Defaults to true.
  //path: '/socket.io' // The path under which engine.io and the static files will be served. Defaults to /socket.io.
  // https://github.com/Automattic/engine.io#methods-1
  //pingTimeout: 60000, // (Number): how many ms without a pong packet to consider the connection closed (60000)
  //pingInterval: 25000, // (Number): how many ms before sending a new ping packet (25000)
  //maxHttpBufferSize: 10E7, // (Number): how many bytes or characters a message can be when polling, before closing the session (to avoid DoS). Default value is 10E7.
  //allowRequest: function(handshake, fn) {}, // (Function): A function that receives a given handshake or upgrade request as its first parameter, and can decide whether to continue or not. The second argument is a function that needs to be called with the decided information: fn(err, success), where success is a boolean value where false means that the request is rejected, and err is an error code.
  //transports: ['polling', 'websocket'], // (<Array> String): transports to allow connections to (['polling', 'websocket'])
  //allowUpgrades: true, // (Boolean): whether to allow transport upgrades (true)
  //cookie: 'io' // (String|Boolean): name of the HTTP cookie that contains the client sid to send as part of handshake response headers. Set to false to not send one. (io)
};

app.use(globalChannel, {
  globalChannel: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'channel',
    cleanOnStartUp: true
  }
});

app.use(status, {status: {
  host: '127.0.0.1',
  port: 6379,
  prefix: 'status',
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