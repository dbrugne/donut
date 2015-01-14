require('newrelic');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('donut', __filename);
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
app.configure('production|test|development', 'connector', function(){
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
app.configure('production|test|development', function() {
  // route configures
  app.route('chat', chatRoute);

  // filter configures
  app.filter(pomelo.timeout());

  // enable the system monitor modules
  //app.enable('systemMonitor'); // should be activated even on Windows to activate other modules (game-server/node_modules/pomelo/lib/util/moduleUtil.js:69), doesn't work on Windows (iostat)
  //app.enable('systemInfo'); // need systemMonitor to work
  //app.enable('monitorLog');
  //app.enable('nodeInfo');
  //app.enable('profiler');
  //app.enable('scripts');
  //app.enable('watchServer');

  // custom admin module
  // load admin modules

  if(typeof app.registerAdmin === 'function'){
    // custom modules
    var onlineUser = require('./app/modules/onlineUser');
    app.registerAdmin(onlineUser, {app: app});

    //// manually load due to pomelo/windows limitation (game-server/node_modules/pomelo/lib/util/moduleUtil.js:69)
    //var admin = require('./node_modules/pomelo/node_modules/pomelo-admin');
    //var pathUtil = require('./node_modules/pomelo/lib/util/pathUtil.js');
    //app.registerAdmin(admin.modules.monitorLog, {path: pathUtil.getLogPath(app.getBase())});
  }
});

// start app
app.start();

process.on('uncaughtException', function(err) {
  console.error(' Caught exception: ' + err.stack);
});