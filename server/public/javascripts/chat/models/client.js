define([
  'underscore',
  'backbone',
  'socket.io'
], function (_, Backbone, io) {
  var ClientModel = Backbone.Model.extend({

    initialize: function() {
    },

    debug: function(message) {
      console.log(message);
    },

    // connect should be done at the end of App initialization to allow interface binding to work
    connect: function() {
      this.socket = io.connect(window.location.hostname);
      var that = this;

      this.socket.on('connecting', function () { that.trigger('connecting'); });
      this.socket.on('connect', function () { that.trigger('connect'); });
      this.socket.on('disconnect', function () { that.trigger('disconnect'); });
      this.socket.on('connect_failed', function () { that.trigger('connect_failed'); });
      this.socket.on('reconnecting', function () { that.trigger('reconnecting'); });
      this.socket.on('reconnect', function () { that.trigger('reconnect'); });
      this.socket.on('reconnect_failed', function () { that.trigger('reconnect_failed'); });
      this.socket.on('error', function () { that.debug(['socket error', arguments]); });
      this.socket.on('welcome', function (data) {
        that.debug(['io:in:welcome', data]);
        that.trigger('welcome', data);
      });

      // ROOM
      // ======================================================

      this.socket.on('room:join', function(data) {
        that.debug(['io:in:room:join', data]);
        that.trigger('room:join', data);
      });
      this.socket.on('room:leave', function(data) {
        that.debug(['io:in:room:leave', data]);
        that.trigger('room:leave', data);
      });
      this.socket.on('room:welcome', function(data) {
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
      this.socket.on('room:searchsuccess', function(data) {
        that.debug(['io:in:room:searchsuccess', data]);
        that.trigger('room:searchsuccess', data);
      });
      this.socket.on('room:searcherror', function(data) {
        that.debug(['io:in:room:searcherror', data]);
        that.trigger('room:searcherror', data);
      });

      // USER
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
      this.socket.on('user:searchsuccess', function(data) {
        that.debug(['io:in:user:searchsuccess', data]);
        that.trigger('user:searchsuccess', data);
      });
      this.socket.on('user:searcherror', function(data) {
        that.debug(['io:in:user:searcherror', data]);
        that.trigger('user:searcherror', data);
      });
    },

    // ROOM
    // ======================================================

    join: function(name) {
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
    roomSearch: function(search) {
      var data = {search: search};
      this.socket.emit('room:search', data);
      this.debug(['io:out:room:search', data]);
    },

    // USER
    // ======================================================

    userMessage: function(to, message) {
      var data = {to: to, message: message};
      this.socket.emit('user:message', data);
      this.debug(['io:out:user:message', data]);
    },
    userSearch: function(search) {
      var data = {search: search};
      this.socket.emit('user:search', data);
      this.debug(['io:out:user:search', data]);
    }

  });

  return new ClientModel();
});