var pomelo = require('pomelo');
var dispatcher = require('./app/util/dispatcher');

// route definition for chat server
var chatRoute = function(session, msg, app, cb) {
  var chatServers = app.getServersByType('chat');

  if(!chatServers || chatServers.length === 0) {
    cb(new Error('can not find chat servers.'));
    return;
  }

  var res = dispatcher.dispatch(session.get('rid'), chatServers);

  cb(null, res.id);
};

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'donut');

// app configuration
app.configure('production|development', 'connector', function(){
  app.set('connectorConfig',
    {
      //connector : pomelo.connectors.hybridconnector,
      //heartbeat : 3
      connector : pomelo.connectors.sioconnector,
      //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
      transports : ['websocket'],
      heartbeats : true,
      closeTimeout : 60,
      heartbeatTimeout : 60,
      heartbeatInterval : 25
    });
});

app.configure('production|development', 'gate', function(){
  app.set('connectorConfig',
    {
      //connector : pomelo.connectors.hybridconnector,
      //heartbeat : 3
      connector : pomelo.connectors.sioconnector,
      //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
      transports : ['websocket','jsonp-polling'],
      heartbeats : true,
      closeTimeout : 60,
      heartbeatTimeout : 60,
      heartbeatInterval : 25
    });
});

// app configure
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