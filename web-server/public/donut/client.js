define([
  'underscore',
  'backbone',
  'libs/donut-debug',
  'pomelo'
], function (_, Backbone, donutDebug, pomelo) {

  var debug = donutDebug('donut:client');

  var client = _.extend({

    initialize: function () {
      var events = [
        // connection/reconnection
        'connect',
        'disconnect',
        'error',
        'reconnect',
        'reconnect_attempt',
        'reconnecting',
        'reconnect_error',
        'reconnect_failed',
        // admin
        'admin:reload',
        'admin:exit',
        'admin:message',
        // donut
        'welcome',
        'room:join',
        'room:leave',
        'room:message',
        'room:message:edit',
        'room:topic',
        'room:in',
        'room:out',
        'room:updated',
        'room:op',
        'room:deop',
        'room:voice',
        'room:devoice',
        'room:kick',
        'room:ban',
        'room:deban',
        'room:viewed',
        'room:message:spam',
        'room:message:unspam',
        'room:typing',
        'user:join',
        'user:leave',
        'user:message',
        'user:message:edit',
        'user:online',
        'user:offline',
        'user:updated',
        'user:preferences',
        'user:viewed',
        'user:ban',
        'user:deban',
        'user:typing',
        'notification:new',
        'notification:read',
        'notification:done'
      ];
      _.each(events, _.bind(function(event) {
        pomelo.on(event, function(data) {
          debug('io:in:' + event, data);
          this.trigger(event,  data);
        }, this);
      }, this));
    },

    /**
     * Should be done at the end of App initialization to allow interface binding to work
     *
     * @param host could be use to force connection on given host
     * @param port could be use to force connection on given port
     */
    connect: function(host, port) {
      this.trigger('connecting');
      pomelo.connect(host, port);
    },
    disconnect: function() {
      pomelo.disconnect();
    },
    isConnected: function() {
      return pomelo.isConnected();
    },

    // GLOBAL METHODS
    // ======================================================

    home: function() {
      var that = this;
      debug('io:out:home', {});
      pomelo.request(
          'chat.homeHandler.home',
          {},
          function(response) {
            if (response.err)
              return debug('io:in:home error: ', response);

            debug('io:in:home', response);
            that.trigger('home', response);
          }
      );
    },
    search: function(search, rooms, users, limit, light, callback) {
      var data = {
        search: search, // string to search for
        limit: (limit)
          ? limit
          : 100,
        light: (light)  // if the search should return a light version of results or not
          ? true
          : false,
        limit: (limit)
          ? limit
          : 5,
        rooms: (rooms) // if we should search for rooms
          ? true
          : false,
        users: (users) // if we should search for users
          ? true
          : false
      };
      debug('io:out:search', data);
      pomelo.request(
        'chat.searchHandler.search',
        data,
        function (response) {
          debug('io:in:search', response);
          if (_.isFunction(callback))
            return callback(response);
        }
      );
    },

    // ROOM METHODS
    // ======================================================

    roomJoin: function (name, callback) {
      var data = {name: name};
      debug('io:out:room:join', data);
      pomelo.request(
        'chat.roomJoinHandler.join',
        data,
        function (response) {
          debug('io:in:room:join', response);
          if (_.isFunction(callback))
            return callback(response);
        }
      );
    },
    roomLeave: function (name) {
      var data = {name: name};
      pomelo.notify('chat.roomLeaveHandler.leave', data);
      debug('io:out:room:leave', data);
    },
    roomMessage: function (name, message, images, callback) {
      var data = {name: name, message: message, images: images};
      var that = this;
      pomelo.request(
        'chat.roomMessageHandler.message',
        data,
        function (response) {
          debug('io:in:room:message', response);
          if (_.isFunction(callback))
            return callback(response);
        }
      );
    },
    roomMessageEdit: function (name, messageId, message) {
      var data = {name: name, event: messageId, message: message};
      pomelo.notify('chat.roomMessageEditHandler.edit', data);
      debug('io:out:room:message:edit', data);
    },
    roomTopic: function (name, topic) {
      var data = {name: name, topic: topic};
      debug('io:out:room:topic', data);
      var that = this;
      pomelo.request(
        'chat.roomTopicHandler.topic',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:topic error: ', response);
        }
      );
    },
    roomRead: function (name, fn) {
      var data = {name: name};
      debug('io:out:room:read', data);
      var that = this;
      pomelo.request(
        'chat.roomReadHandler.read',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:read error: ', response);

          debug('io:in:room:read', response);
          return fn(response);
        }
      );
    },
    roomUsers: function (name, fn) {
      var data = {name: name};
      debug('io:out:room:users', data);
      var that = this;
      pomelo.request(
        'chat.roomUsersHandler.users',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:users error: ', response);

          debug('io:in:room:users', response);
          return fn(response);
        }
      );
    },
    roomUpdate: function (name, fields, fn) {
      var data = {name: name, data: fields};
      debug('io:out:room:update', data);
      var that = this;
      pomelo.request(
        'chat.roomUpdateHandler.update',
        data,
        function (response) {
          debug('io:in:room:update', response);
          return fn(response);
        }
      );
    },
    roomCreate: function (name, callback) {
      var data = {name: name};
      debug('io:out:room:create', data);
      pomelo.request(
        'chat.roomCreateHandler.create',
        data,
        function (response) {
          debug('io:in:room:create', response);
          if (_.isFunction(callback))
            return callback(response);
        }
      );
    },
    roomDelete: function (name) {
      var data = {name: name};
      debug('io:out:room:delete', data);
      var that = this;
      pomelo.request(
        'chat.roomDeleteHandler.delete',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:delete error: ', response);
        }
      );
    },
    roomHistory: function (name, since, limit, fn) {
      var data = {name: name, since: since, limit: limit};
      debug('io:out:room:history', data);
      var that = this;
      pomelo.request(
        'chat.roomHistoryHandler.history',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:history error: ', response);

          debug('io:in:room:history', response);
          return fn(response);
        }
      );
    },
    roomOp: function (name, username) {
      var data = {name: name, username: username};
      debug('io:out:room:op', data);
      var that = this;
      pomelo.request(
        'chat.roomOpHandler.op',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:op error: ', response);
        }
      );
    },
    roomDeop: function (name, username) {
      var data = {name: name, username: username};
      debug('io:out:room:deop', data);
      var that = this;
      pomelo.request(
        'chat.roomDeopHandler.deop',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:deop error: ', response);
        }
      );
    },
    roomVoice: function (name, username) {
      var data = {name: name, username: username};
      debug('io:out:room:voice', data);
      var that = this;
      pomelo.request(
        'chat.roomVoiceHandler.voice',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:voice error: ', response);
        }
      );
    },
    roomDevoice: function (name, username, reason) {
      var data = {name: name, username: username};
      if (reason)
        data.reason = reason;
      debug('io:out:room:devoice', data);
      var that = this;
      pomelo.request(
        'chat.roomDevoiceHandler.devoice',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:devoice error: ', response);
        }
      );
    },
    roomKick: function (name, username, reason) {
      var data = {name: name, username: username};
      if (reason)
        data.reason = reason;
      debug('io:out:room:kick', data);
      var that = this;
      pomelo.request(
        'chat.roomKickHandler.kick',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:kick error: ', response);
        }
      );
    },
    roomBan: function (name, username, reason) {
      var data = {name: name, username: username};
      if (reason)
        data.reason = reason;
      debug('io:out:room:ban', data);
      var that = this;
      pomelo.request(
        'chat.roomBanHandler.ban',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:ban error: ', response);
        }
      );
    },
    roomDeban: function (name, username) {
      var data = {name: name, username: username};
      debug('io:out:room:deban', data);
      var that = this;
      pomelo.request(
        'chat.roomDebanHandler.deban',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:room:deban error: ', response);
        }
      );
    },
    roomViewed: function (name, events) {
      var data = {name: name, events: events};
      pomelo.notify('chat.roomViewedHandler.viewed', data);
      debug('io:out:room:viewed', data);
    },
    roomMessageSpam: function(name, messageId) {
      var data = {name: name, event: messageId};
      debug('io:out:room:message:spam', data);
      pomelo.request(
        'chat.roomMessageSpamHandler.spam',
        data,
        function(response) {
          if (response.err)
            return debug('io:in:room:message:spam: ', response);
        }
      );
    },
    roomMessageUnspam: function(name, messageId) {
      var data = {name: name, event: messageId};
      debug('io:out:room:message:unspam', data);
      pomelo.request(
        'chat.roomMessageUnspamHandler.unspam',
        data,
        function(response) {
          if (response.err)
            return debug('io:in:room:message:unspam: ', response);
        }
      );
    },
    roomTyping: function (name) {
      var data = { name: name };
      debug('io:out:room:typing', data);
      pomelo.notify('chat.roomTypingHandler.typing', data);
    },

    // USER METHODS
    // ======================================================

    userBan: function(username) {
      var data = { username: username };
      debug('io:out:user:ban', data);
      var that = this;
      pomelo.request(
        'chat.userBanHandler.ban',
        data,
        function(response) {
          if (response.err)
            return debug('io:in:user:ban error: ', response);
        }
      );
    },
    userDeban: function(username) {
      var data = { username: username };
      debug('io:out:user:deban', data);
      var that = this;
      pomelo.request(
        'chat.userDebanHandler.ban',
        data,
        function(response) {
          if (response.err)
              return debug('io:in:user:deban error: ', response);
        }
      );
    },
    userJoin: function (username) {
      var data = {username: username};
      debug('io:out:user:join', data);
      var that = this;
      pomelo.request(
        'chat.userJoinHandler.join',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:user:join error: ', response);
        }
      );
    },
    userLeave: function (username) {
      var data = {username: username};
      pomelo.notify('chat.userLeaveHandler.leave', data);
      debug('io:out:user:leave', data);
    },
    userMessage: function (username, message, images, callback) {
      var data = {username: username, message: message, images: images};
      debug('io:out:user:message', data);
      var that = this;
      pomelo.request(
        'chat.userMessageHandler.message',
        data,
        function (response) {
          debug('io:in:user:message', response);
          if (_.isFunction(callback))
            return callback(response);
        }
      );
    },
    userMessageEdit: function (username, messageId, message) {
      var data = { username: username, event: messageId, message: message };
      pomelo.notify('chat.userMessageEditHandler.edit', data);
      debug('io:out:user:message:edit', data);
    },
    userRead: function (username, fn) {
      var data = {username: username};
      debug('io:out:user:read', data);
      var that = this;
      pomelo.request(
        'chat.userReadHandler.read',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:user:read error: ', response);

          debug('io:in:user:read', response);
          return fn(response);
        }
      );
    },
    userUpdate: function (fields, fn) {
      var data = {data: fields};
      debug('io:out:user:update', data);
      var that = this;
      pomelo.request(
        'chat.userUpdateHandler.update',
        data,
        function (response) {
          debug('io:in:user:update', response);
          return fn(response);
        }
      );
    },
    userPreferencesRead: function (name, fn) {
      var data = (name) ? {name: name} : {};
      debug('io:out:user:preferences:read', data);
      var that = this;
      pomelo.request(
        'chat.userPreferencesHandler.read',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:user:preferences:read error: ', response);

          debug('io:in:user:preferences:read', response);
          return fn(response);
        }
      );
    },
    userPreferencesUpdate: function (fields, callback) {
      var data = {data: fields};
      debug('io:out:user:preferences:update', data);
      var that = this;
      pomelo.request(
        'chat.userPreferencesHandler.update',
        data,
        function (response) {
          debug('io:in:user:preferences:update', response);
          if (_.isFunction(callback))
            return callback(response);
        }
      );
    },
    userNotifications: function (viewed, time, number, fn) {
      var data = {viewed: viewed, time: time, number: number};
      debug('io:out:user:notifications', data);
      var that = this;
      pomelo.request(
        'chat.userNotificationsHandler.read',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:user:notifications error: ', response);

          debug('io:in:user:notifications', response);
          return fn(response);
        }
      );
    },
    userHistory: function (username, since, limit, fn) {
      var data = {username: username, since: since, limit: limit};
      debug('io:out:user:history', data);
      var that = this;
      pomelo.request(
        'chat.userHistoryHandler.history',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:user:history error: ', response);

          debug('io:in:user:history', response);
          return fn(response);
        }
      );
    },
    userViewed: function (username, events) {
      var data = {username: username, events: events};
      pomelo.notify('chat.userViewedHandler.viewed', data);
      debug('io:out:user:viewed', data);
    },

    // Called to set Notifications as viewed for current user
    userNotificationsViewed: function (ids, all, fn) {
      var data = {ids: ids, all: all};
      debug('io:out:user:notificationsViewed', data);
      var that = this;
      pomelo.request(
        'chat.userNotificationsHandler.viewed',
        data,
        function (response) {
          if (response.err)
            return debug('io:in:user:notifications error: ', response);

          debug('io:in:user:notificationsViewed', response);
          return fn(response);
        }
      );
    },

    // Called to set Notifications as viewed for current user
    userNotificationsDone: function (id, fn) {
      var data = {id: id};
      pomelo.notify('chat.userNotificationsHandler.done', data);
      debug('io:out:notification:done', data);
    },

    userTyping: function(userId) {
      var data = { user_id: userId };
      debug('io:out:user:typing', data);
      pomelo.notify('chat.userTypingHandler.typing', data);
    },

  }, Backbone.Events);

  client.initialize();
  return client;
});