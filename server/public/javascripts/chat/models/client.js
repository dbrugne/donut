define([
  'underscore',
  'backbone',
  'socket.io'
], function (_, Backbone, io) {
  var ClientModel = Backbone.Model.extend({

    joinRequests: [],

    initialize: function() {
    },

    debug: function(message) {
      console.log(message);
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
        that.trigger('online');
      });
      this.socket.on('reconnect', function (num) {
        that.debug('socket.io-client successful reconnected at #'+num+' attempt');
        that.trigger('online');
      });
      this.socket.on('reconnect_attempt', function () {
        that.trigger('connecting');
      });
      this.socket.on('reconnecting', function (num) {
        that.debug('socket.io-client try to reconnect, #'+num+' attempt');
        that.trigger('connecting');
      });
      this.socket.on('connect_timeout', function () {
        that.debug('socket.io-client timeout');
        that.trigger('connecting');
      });
      var onError = function(err) {
        that.debug('socket.io-client error: '+err);
        that.trigger('error');
      };
      this.socket.on('connect_error', onError);
      this.socket.on('reconnect_error', onError);
      this.socket.on('reconnect_failed', onError);

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
      this.socket.on('room:profile', function(data) {
        that.debug(['io:in:room:profile', data]);
        that.trigger('room:profile', data);
      });
      this.socket.on('room:searchsuccess', function(data) {
        that.debug(['io:in:room:searchsuccess', data]);
        that.trigger('room:searchsuccess', data);
      });
      this.socket.on('room:searcherror', function(data) {
        that.debug(['io:in:room:searcherror', data]);
        that.trigger('room:searcherror', data);
      });
      this.socket.on('room:permanent', function(data) {
        that.debug(['io:in:room:permanent', data]);
        that.trigger('room:permanent', data);
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
      this.socket.on('user:open', function(data) {
        that.debug(['io:in:user:open', data]);
        that.trigger('user:open', data);
      });
      this.socket.on('user:close', function(data) {
        that.debug(['io:in:user:close', data]);
        that.trigger('user:close', data);
      });
      this.socket.on('user:message', function(data) {
        that.debug(['io:in:user:message', data]);
        that.trigger('user:message', data);
      });
      this.socket.on('user:searchsuccess', function(data) {
        that.debug(['io:in:user:searchsuccess', data]);
        that.trigger('user:searchsuccess', data);
      });
      this.socket.on('user:searcherror', function(data) {
        that.debug(['io:in:user:searcherror', data]);
        that.trigger('user:searcherror', data);
      });
      this.socket.on('user:profile', function(data) {
        that.debug(['io:in:user:profile', data]);
        that.trigger('user:profile', data);
      });
      this.socket.on('user:status', function(data) {
        that.debug(['io:in:user:status', data]);
        that.trigger('user:status', data);
      });
    },

    // GLOBAL METHODS
    // ======================================================

    home: function() {
      this.socket.emit('home', {});
      this.debug(['io:out:home', {}]);
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
    roomProfile: function(name) {
      var data = {name: name};
      this.socket.emit('room:profile', data);
      this.debug(['io:out:room:profile', data]);
    },
    roomSearch: function(search) {
      var data = {search: search};
      this.socket.emit('room:search', data);
      this.debug(['io:out:room:search', data]);
    },
    roomPermanent: function(name, permanent) {
      var data = {name: name, permanent: permanent};
      this.socket.emit('room:permanent', data);
      this.debug(['io:out:room:permanent', data]);
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

    // USER METHODS
    // ======================================================

    open: function(username) {
      var data = {username: username};
      this.socket.emit('user:open', data);
      this.debug(['io:out:user:open', data]);
    },
    close: function(username) {
      var data = {username: username};
      this.socket.emit('user:close', data);
      this.debug(['io:out:user:close', data]);
    },
    userMessage: function(to, message) {
      var data = {to: to, message: message};
      this.socket.emit('user:message', data);
      this.debug(['io:out:user:message', data]);
    },
    userSearch: function(search) {
      var data = {search: search};
      this.socket.emit('user:search', data);
      this.debug(['io:out:user:search', data]);
    },
    userProfile: function(userId) {
      var data = {user_id: userId};
      this.socket.emit('user:profile', data);
      this.debug(['io:out:user:profile', data]);
    },
    userStatus: function(username) {
      var data = {username: username};
      this.socket.emit('user:status', data);
      this.debug(['io:out:user:status', data]);
    }

  });

  return new ClientModel();
});