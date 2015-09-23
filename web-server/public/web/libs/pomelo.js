var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var donutDebug = require('./donut-debug');
var io = require('socket.io-client');

var debug = donutDebug('donut:pomelo');

// @source: https://github.com/gloomyzerg/pomelo-jsclient-socket.io-bower

var pomelo = _.extend({
  current: '', // store the current connector URL on which this client is connected

  token: null, // current JWT token used for WS authentication

  socket: null, // current sio socket

  callbacks: {}, // list of callbacks to run on responses

  autoIncrement: 1,

  protocolHeaderLength: 5, // pomelo protocol message header size (https://github.com/NetEase/pomelo/wiki/Communication-Protocol)

  initialize: function (options) {
    this.settings = _.extend(options, {
      //
    });
  },

  /**
   * Public API
   */
  connect: function (host, port) {
    debug.start('sio_connect');
    if (this.isConnected())
      this.disconnect();

    // in console: client.connect('chat.local', 3050)
    if (!host) {
      host = 'ws.' + window.location.hostname; // host should be a subdomain of current hostname to be able to receive cookies
    }

    var server = {
      host: host,
      port: port || null
    };
    return this._connect(server);
  },
  disconnect: function () {
    if (!this.socket)
      return;

    this.socket.disconnect();
    this.socket = null;
  },
  isConnected: function () {
    return (this.socket && this.socket.connected === true);
  },
  request: function (route) {
    if (!route)
      return;

    var msg = {};
    var cb;

    var arg = _.toArray(arguments);
    if (arg.length === 2) {
      if (typeof arg[1] === 'function') {
        cb = arg[1];
      } else if (typeof arg[1] === 'object') {
        msg = arg[1];
      }
    } else if (arg.length === 3) {
      msg = arg[1];
      cb = arg[2];
    }

    this.autoIncrement++;
    this.callbacks[this.autoIncrement] = cb;
    var sg = this._encode(this.autoIncrement, route, msg);

    this.socket.send(sg);
  },
  notify: function (route, data) {
    this.request(route, data);
  },

  /**
   * Private API
   */
  _connect: function (server) {
    debug.end('sio_connect');

    var that = this;
    this._requestToken(false, function (err, token) {
      if (err)
        return that.trigger('error', err);

      that._sio(server);
    });
  },
  _requestToken: function (force, fn) {
    if (this.token && !force)
      return fn(null, this.token);

    debug.start('sio_token');
    var that = this;
    $.ajax({
      url: '/oauth/get-token-from-session',
      type: 'GET',
      dataType: 'json',
      success: function ( json ) {
        if (json.err)
          return fn(json.err);

        that.token = json.token;
        debug.end('sio_token');
        return fn(null, json.token);
      },
      error: function ( xhr, status, errorThrown ) {
        debug.end('sio_token');
        return fn(errorThrown);
      }
    });
  },
  _sio: function (server) {
    debug.start('sio_connect');
    // @doc: https://github.com/Automattic/engine.io-client#methods
    var options = {
      // multiplex: true,
      reconnection: true,
      // reconnectionDelay: 1000,
      // reconnectionDelayMax: 5000,
      timeout: 8000, // = between 2 heartbeat pings
      // autoConnect: true,
      forceNew: true, // http://stackoverflow.com/questions/24566847/socket-io-client-connect-disconnect allow me to connect() disconnect() from console
      query: 'device=browser'
    };

    this.current = '//' + server.host;
    if (server.port)
      this.current += ':' + server.port;
    this.socket = io(this.current, options);

    var that = this;

    // triggered when server has confirmed user authentication
    this.socket.on('authenticated', function () {
      debug('authentication accepted');
      debug.end('sio_connect');
      that.trigger('connect');
      that._requestWelcome();
    });
    this.socket.on('unauthorized', function (error) {
      debug.end('sio_connect');
      debug('authentication rejected', error);

      // special case, reconnection with an expired token
      if (error.message == 'jwt expired')
        that._requestToken(true, function (err, token) {
          if (err)
            return that.trigger('error', err);

          that._sio(server);
        });

      that.trigger('error', error.message);
    });

    this.socket.on('disconnect', function (reason) { that.trigger('disconnect', reason); }); // disconnected
    this.socket.on('error', function (err) { that.trigger('error', err); }); // connection error

    // reconnect events
    this.socket.on('reconnect', function (num) { that.trigger('reconnect', num); }); // successful reconnection
    this.socket.on('reconnect_attempt', function () { that.trigger('reconnect_attempt'); }); // will try a new reconnection
    this.socket.on('reconnecting', function (num) { that.trigger('reconnecting', num); }); // trying new reconnection
    this.socket.on('reconnect_error', function (err) { that.trigger('reconnect_error', err); }); // reconnection error
    this.socket.on('reconnect_failed', function () { that.trigger('reconnect_failed'); }); // couldn’t reconnect within reconnectionAttempts

    // pomelo server send exclusively 'message' events
    this.socket.on('message', function (data) {
      if (typeof data === 'string')
        data = JSON.parse(data);
      if (data instanceof Array)
        that._messages(data);
      else
        that._message(data);
    });

    // socket listener are set, go connect, then authenticate
    this.socket.on('connect', function () {
      debug('connected to ' + that.current);
      that.socket.emit('authenticate', { token: that.token });
    });
  },
  _requestWelcome: function () {
    var that = this;
    debug.start('sio_entryHandler');
    this.request('connector.entryHandler.enter', {}, function (data) {
      if (data.error)
        return debug('connector.entryHandler.enter returns error', data);

      debug('welcome received');
      debug.end('sio_entryHandler');

      that.trigger('welcome', data);
    });
  },
  _message: function (data) {
    // .request(), client call server and get a response
    if (data.id) {
      var callback = this.callbacks[data.id];

      delete this.callbacks[data.id];

      // .notify(), client call server and don't wait for a response
      if (typeof callback !== 'function')
        return;

      return callback(data.body);
    }

    // .push(), server call client
    var route = data.route;
    if (!!route) {
      if (!!data.body) {
        var body = data.body.body;
        if (!body) {body = data.body;}
        this.trigger(route, body);
      } else {
        this.trigger(route, data);
      }
    } else {
      this.trigger(data.body.route, data.body);
    }
  },
  _messages: function (msgs) {
    _.each(msgs, function (msg) {
      this._message(msg);
    }, this);
  },

  /**
   * Encode a message for pomelo
   *
   * JSON object (donut) => byteArray (Pomelo) => String (socket.io)
   *
   * @param id
   * @param route
   * @param data
   * @returns String
   */
  _encode: function (id, route, data) {
    var msgStr = JSON.stringify(data);

    if (route.length > 255)
      throw new Error('route maxlength is overflow');

    var byteArray = new Uint16Array(this.protocolHeaderLength + route.length + msgStr.length); // need polyfill in lte IE9
    var index = 0;
    byteArray[index++] = (id >> 24) & 0xFF;
    byteArray[index++] = (id >> 16) & 0xFF;
    byteArray[index++] = (id >> 8) & 0xFF;
    byteArray[index++] = id & 0xFF;
    byteArray[index++] = route.length & 0xFF;
    for (var i = 0; i < route.length; i++) {
      byteArray[index++] = route.charCodeAt(i);
    }
    for (var i = 0; i < msgStr.length; i++) {
      byteArray[index++] = msgStr.charCodeAt(i);
    }
    return this._byteArrayToString(byteArray, 0, byteArray.length);
  },

  /**
   * Decode a message from pomelo
   *
   * String (socket.io) => byteArray (Pomelo) => JSON object (donut)
   *
   * @param data
   * @returns {{id: number, route: *, body: *}}
   */
  _decode: function (data) {
    var idx;
    var len = data.length;
    var arr = new Array(len);
    for (idx = 0; idx < len; ++idx) {
      arr[idx] = data.charCodeAt(idx);
    }
    var index = 0;
    var buf = new Uint16Array(arr);
    var id = ((buf[index++] << 24) | (buf[index++]) << 16 | (buf[index++]) << 8 | buf[index++]) >>> 0;
    var routeLen = buf[this.protocolHeaderLength - 1];
    var route = this._byteArrayToString(buf, this.protocolHeaderLength, routeLen + this.protocolHeaderLength);
    var body = this._byteArrayToString(buf, routeLen + this.protocolHeaderLength, buf.length);
    return { id: id, route: route, body: body };
  },

  _byteArrayToString: function (byteArray, start, end) {
    var result = '';
    for (var i = start; i < byteArray.length && i < end; i++) {
      result = result + String.fromCharCode(byteArray[i]);
    }
    return result;
  }

}, Backbone.Events);

pomelo.initialize();

module.exports = pomelo;