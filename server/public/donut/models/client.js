define([
  'underscore',
  'backbone',
  'socket.io'
], function (_, Backbone, io) {
  var ClientModel = Backbone.Model.extend({

    joinRequests: [],

    initialize: function() {
      localStorage.debug = ''; // @debug ('*')
    },

    debug: function(message) {
      console.log(message); // @debug
    },

    // connect should be done at the end of App initialization to allow interface binding to work
    connect: function() {

      this.socket = io(window.location.hostname, {
        //multiplex: true,
        //reconnection: true,
        //reconnectionDelay: 1000,
        //reconnectionDelayMax: 5000,
        //timeout: 20000, // = between 2 heartbeat pings
        //autoConnect: true
      });

      // CONNECTION EVENTS
      // ======================================================
      var that = this;
      this.socket.on('connect', function () {
        that.trigger('connected');
      });
      this.socket.on('disconnect', function () {
        that.debug('socket.io-client disconnect');
        that.trigger('disconnected');
      });
      this.socket.on('reconnect', function (num) {
        that.debug('socket.io-client successful reconnected at #'+num+' attempt');
        that.trigger('reconnected');
      });
      this.socket.on('reconnect_attempt', function () {
        that.trigger('connecting');
      });
      this.socket.on('reconnecting', function (num) {
        that.debug('socket.io-client try to reconnect, #'+num+' attempt');
        that.trigger('connecting');
      });
      this.socket.on('connect_timeout', function () { // fired on socket or only on manager? http://socket.io/docs/client-api/#socket
        that.debug('socket.io-client timeout');
        that.trigger('connecting');
      });
      var onError = function(err) {
        that.debug('socket.io-client error: '+err);

        if (err == 'notlogged')
          that.trigger('notlogged');
        else
          that.trigger('error');
      };
      this.socket.on('connect_error', onError); // fired on socket or only on manager? http://socket.io/docs/client-api/#socket
      this.socket.on('reconnect_error', onError);
      this.socket.on('reconnect_failed', onError);
      this.socket.on('error', onError); // on socket

      // GLOBAL EVENTS
      // ======================================================
      this.socket.on('welcome', function (data) {
        that.debug(['io:in:welcome', data]);
        that.trigger('welcome', data);
      });
      this.socket.on('home', function (data) {
        that.debug(['io:in:home', data]);
        that.trigger('home', data);
      });
      this.socket.on('search', function(data) {
        that.debug(['io:in:search', data]);
        that.trigger('search', data);
      });

      // ROOM EVENTS
      // ======================================================

      this.socket.on('room:leave', function(data) {
        that.debug(['io:in:room:leave', data]);
        that.trigger('room:leave', data);
      });
      this.socket.on('room:welcome', function(data) {
        delete that.joinRequests[that.joinRequests.indexOf(data.name)];
        that.debug(['io:in:room:welcome', data]);
        that.trigger('room:welcome', data);
      });
      this.socket.on('room:topic', function(data) {
        that.debug(['io:in:room:topic', data]);
        that.trigger('room:topic', data);
      });
      this.socket.on('room:in', function(data) {
        that.debug(['io:in:room:in', data]);
        that.trigger('room:in', data);
      });
      this.socket.on('room:out', function(data) {
        that.debug(['io:in:room:out', data]);
        that.trigger('room:out', data);
      });
      this.socket.on('room:message', function(data) {
        that.debug(['io:in:room:message', data]);
        that.trigger('room:message', data);
      });
      this.socket.on('room:read', function(data) {
        that.debug(['io:in:room:read', data]);
        that.trigger('room:read', data);
      });
      this.socket.on('room:update', function(data) {
        that.debug(['io:in:room:update', data]);
        that.trigger('room:update', data);
      });
      this.socket.on('room:updated', function(data) {
        that.debug(['io:in:room:updated', data]);
        that.trigger('room:updated', data);
      });
      this.socket.on('room:delete', function(data) {
        that.debug(['io:in:room:delete', data]);
        that.trigger('room:delete', data);
      });
      this.socket.on('room:history', function(data) {
        that.debug(['io:in:room:history', data]);
        that.trigger('room:history', data);
      });
      this.socket.on('room:op', function(data) {
        that.debug(['io:in:room:op', data]);
        that.trigger('room:op', data);
      });
      this.socket.on('room:deop', function(data) {
        that.debug(['io:in:room:deop', data]);
        that.trigger('room:deop', data);
      });
      this.socket.on('room:kick', function(data) {
        that.debug(['io:in:room:kick', data]);
        that.trigger('room:kick', data);
      });

      // USER EVENTS
      // ======================================================

      this.socket.on('user:online', function(data) {
        that.debug(['io:in:user:online', data]);
        that.trigger('user:online', data);
      });
      this.socket.on('user:offline', function(data) {
        that.debug(['io:in:user:offline', data]);
        that.trigger('user:offline', data);
      });
      this.socket.on('user:message', function(data) {
        that.debug(['io:in:user:message', data]);
        that.trigger('user:message', data);
      });
      this.socket.on('user:profile', function(data) {
        that.debug(['io:in:user:profile', data]);
        that.trigger('user:profile', data);
      });
      this.socket.on('user:read', function(data) {
        that.debug(['io:in:user:read', data]);
        that.trigger('user:read', data);
      });
      this.socket.on('user:update', function(data) {
        that.debug(['io:in:user:update', data]);
        that.trigger('user:update', data);
      });
      this.socket.on('user:updated', function(data) {
        that.debug(['io:in:user:updated', data]);
        that.trigger('user:updated', data);
      });
      this.socket.on('user:status', function(data) {
        that.debug(['io:in:user:status', data]);
        that.trigger('user:status', data);
      });
    },

    disconnect: function() {
//      this.socket.destroy();
//      this.socket.cleanup();
    },

    reconnect: function() {
      this.socket.reconnect();
    },

    // GLOBAL METHODS
    // ======================================================

    home: function() {
      this.socket.emit('home', {});
      this.debug(['io:out:home', {}]);
    },
    search: function(search) {
      var data = {search: search};
      this.socket.emit('search', data);
      this.debug(['io:out:search', data]);
    },

    // ROOM METHODS
    // ======================================================

    join: function(name) {
      if (this.joinRequests.indexOf(name) != -1) {
        return;
      }
      this.joinRequests.push(name);
      var data = {name: name};
      this.socket.emit('room:join', data);
      this.debug(['io:out:room:join', data]);
    },
    leave: function(name) {
      var data = {name: name};
      this.socket.emit('room:leave', data);
      this.debug(['io:out:room:leave', data]);
    },
    topic: function(name, topic) {
      var data = {name: name, topic: topic};
      this.socket.emit('room:topic', data);
      this.debug(['io:out:room:topic', data]);
    },
    roomMessage: function(name, message) {
      var data = {name: name, message: message};
      this.socket.emit('room:message', data);
      this.debug(['io:out:room:message', data]);
    },
    roomRead: function(name) {
      var data = {name: name};
      this.socket.emit('room:read', data);
      this.debug(['io:out:room:read', data]);
    },
    roomUpdate: function(name, fields) {
      var data = {name: name, data: fields};
      this.socket.emit('room:update', data);
      this.debug(['io:out:room:update', data]);
    },
    roomDelete: function(name) {
      var data = {name: name};
      this.socket.emit('room:delete', data);
      this.debug(['io:out:room:delete', data]);
    },
    roomHistory: function(name, number) {
      number = number || 50;
      var data = {name: name, number: number};
      this.socket.emit('room:history', data);
      this.debug(['io:out:room:history', data]);
    },
    roomOp: function(name, username) {
      var data = {name: name, username: username};
      this.socket.emit('room:op', data);
      this.debug(['io:out:room:op', data]);
    },
    roomDeop: function(name, username) {
      var data = {name: name, username: username};
      this.socket.emit('room:deop', data);
      this.debug(['io:out:room:deop', data]);
    },
    roomKick: function(name, username, reason) {
      var data = {name: name, username: username};
      if (reason)
        data.reason = reason;
      this.socket.emit('room:kick', data);
      this.debug(['io:out:room:kick', data]);
    },

    // USER METHODS
    // ======================================================

    userMessage: function(username, message) {
      var data = {username: username, message: message};
      this.socket.emit('user:message', data);
      this.debug(['io:out:user:message', data]);
    },
    userProfile: function(username) {
      var data = {username: username};
      this.socket.emit('user:profile', data);
      this.debug(['io:out:user:profile', data]);
    },
    userRead: function() {
      this.socket.emit('user:read', {});
      this.debug(['io:out:user:read', {}]);
    },
    userUpdate: function(fields) {
      var data = {data: fields};
      this.socket.emit('user:update', data);
      this.debug(['io:out:user:update', data]);
    },
    userStatus: function(username) {
      var data = {username: username};
      this.socket.emit('user:status', data);
      this.debug(['io:out:user:status', data]);
    }

  });

  return new ClientModel();
});