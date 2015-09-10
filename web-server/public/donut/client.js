'use strict';
define([
  'underscore',
  'backbone',
  'libs/donut-debug',
  'libs/pomelo'
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
        'room:me',
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
        'user:me',
        'user:message:edit',
        'user:online',
        'user:offline',
        'user:updated',
        'user:viewed',
        'user:ban',
        'user:deban',
        'user:typing',
        'preferences:update',
        'notification:new',
        'notification:read',
        'notification:done'
      ];
      _.each(events, _.bind(function (event) {
        pomelo.on(event, function (data) {
          debug('io:in:' + event, data);
          this.trigger(event, data);
        }, this);
      }, this));
    },

    /**
     * Should be done at the end of App initialization to allow interface
     * binding to work
     *
     * @param host could be use to force connection on given host
     * @param port could be use to force connection on given port
     */
    connect: function (host, port) {
      this.trigger('connecting');
      pomelo.connect(host, port);
    },
    disconnect: function () {
      pomelo.disconnect();
    },
    isConnected: function () {
      return pomelo.isConnected();
    },

    // GLOBAL
    // ======================================================

    home: function () {
      var that = this;
      debug('io:out:home', {});
      pomelo.request(
        'chat.homeHandler.call',
        {},
        function (response) {
          if (response.err) {
            return debug('io:in:home error: ', response);
          }

          debug('io:in:home', response);
          that.trigger('home', response);
        }
      );
    },
    search: function (search, rooms, users, limit, light, callback) {
      var data = {
        search: search, // string to search for
        limit: (limit) ?
          limit :
          100,
        light: (light), // if the search should return a light version of results or not
        rooms: (rooms), // if we should search for rooms
        users: (users) // if we should search for users
      };
      debug('io:out:search', data);
      pomelo.request(
        'chat.searchHandler.call',
        data,
        function (response) {
          debug('io:in:search', response);
          if (_.isFunction(callback)) {
            return callback(response);
          }
        }
      );
    },
    ping: function (fn) {
      var start = Date.now();
      pomelo.request(
        'chat.pingHandler.call',
        {},
        function () {
          var duration = Date.now() - start;
          debug('io:in:ping');
          return fn(duration);
        }
      );
    },

    // ROOM
    // ======================================================

    roomJoin: function (roomId, roomName, callback) {
      var data = {};
      if (roomId) {
        data.room_id = roomId;
      } else if (roomName) {
        data.name = roomName;
      } else {
        return;
      }

      debug('io:out:room:join', data);
      pomelo.request(
        'chat.roomJoinHandler.call',
        data,
        function (response) {
          debug('io:in:room:join', response);
          if (_.isFunction(callback)) {
            return callback(response);
          }
        }
      );
    },
    roomLeave: function (roomId) {
      var data = {room_id: roomId};
      pomelo.notify('chat.roomLeaveHandler.call', data);
      debug('io:out:room:leave', data);
    },
    roomMessage: function (roomId, message, images, callback) {
      var data = {room_id: roomId, message: message, images: images};
      debug('io:out:room:message', data);
      pomelo.request(
        'chat.roomMessageHandler.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:room:message error: ', response);
          }
          if (_.isFunction(callback)) {
            return callback(response);
          }
        }
      );
    },
    roomMe: function (roomId, message, callback) {
      var data = {room_id: roomId, message: message};
      debug('io:out:room:me', data);
      pomelo.request(
        'chat.roomMeHandler.call',
        data,
        function (response) {
          debug('io:in:room:me', response);
          if (_.isFunction(callback)) {
            return callback(response);
          }
        }
      );
    },
    roomMessageEdit: function (roomId, messageId, message) {
      var data = {room_id: roomId, event: messageId, message: message};
      pomelo.notify('chat.roomMessageEditHandler.call', data);
      debug('io:out:room:message:edit', data);
    },
    roomTopic: function (roomId, topic) {
      var data = {room_id: roomId, topic: topic};
      debug('io:out:room:topic', data);
      pomelo.request(
        'chat.roomTopicHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:topic error: ', response);
          }
        }
      );
    },
    roomRead: function (roomId, roomName, fn) {
      var data = {};
      if (roomId) {
        data.room_id = roomId;
      } else if (roomName) {
        data.name = roomName;
      } else {
        return;
      }

      debug('io:out:room:read', data);
      pomelo.request(
        'chat.roomReadHandler.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:room:read error: ', response);
          } else {
            debug('io:in:room:read', response);
          }

          return fn(response.err, response);
        }
      );
    },
    roomUsers: function (roomId, attributes, fn) {
      var data = {room_id: roomId, attributes: attributes};
      debug('io:out:room:users', data);
      pomelo.request(
        'chat.roomUsersHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:users error: ', response);
          }

          debug('io:in:room:users', response);
          return fn(response);
        }
      );
    },
    roomUpdate: function (roomId, fields, fn) {
      var data = {room_id: roomId, data: fields};
      debug('io:out:room:update', data);
      pomelo.request(
        'chat.roomUpdateHandler.call',
        data,
        function (response) {
          debug('io:in:room:update', response);
          return fn(response);
        }
      );
    },
    roomCreate: function (name, options, callback) {
      var data = {
        name: name,
        join_mode: options.join_mode,
        join_mode_password: options.join_mode_password,
        history_mode: options.history_mode
      };
      debug('io:out:room:create', data);
      pomelo.request(
        'chat.roomCreateHandler.call',
        data,
        function (response) {
          debug('io:in:room:create', response);
          if (_.isFunction(callback)) {
            return callback(response);
          }
        }
      );
    },
    roomDelete: function (roomId) {
      var data = {room_id: roomId};
      debug('io:out:room:delete', data);
      pomelo.request(
        'chat.roomDeleteHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:delete error: ', response);
          }
        }
      );
    },
    roomHistory: function (roomId, since, limit, fn) {
      var data = {room_id: roomId, since: since, limit: limit};
      debug('io:out:room:history', data);
      pomelo.request(
        'chat.roomHistoryHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:history error: ', response);
          }

          debug('io:in:room:history', response);
          return fn(response);
        }
      );
    },
    roomOp: function (roomId, userId, username, fn) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }

      debug('io:out:room:op', data);
      pomelo.request(
        'chat.roomOpHandler.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:room:op error: ', response);
          }
          return fn(response.err);
        }
      );
    },
    roomDeop: function (roomId, userId, username, fn) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }

      debug('io:out:room:deop', data);
      pomelo.request(
        'chat.roomDeopHandler.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:room:deop error: ', response);
          }
          return fn(response.err);
        }
      );
    },
    roomVoice: function (roomId, userId, username) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }

      debug('io:out:room:voice', data);
      pomelo.request(
        'chat.roomVoiceHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:voice error: ', response);
          }
        }
      );
    },
    roomDevoice: function (roomId, userId, username, reason) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      if (reason) {
        data.reason = reason;
      }
      debug('io:out:room:devoice', data);
      pomelo.request(
        'chat.roomDevoiceHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:devoice error: ', response);
          }
        }
      );
    },
    roomKick: function (roomId, userId, username, reason) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      if (reason) {
        data.reason = reason;
      }
      debug('io:out:room:kick', data);
      pomelo.request(
        'chat.roomKickHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:kick error: ', response);
          }
        }
      );
    },
    roomBan: function (roomId, userId, username, reason) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      if (reason) {
        data.reason = reason;
      }
      debug('io:out:room:ban', data);
      pomelo.request(
        'chat.roomBanHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:ban error: ', response);
          }
        }
      );
    },
    roomDeban: function (roomId, userId, username) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      debug('io:out:room:deban', data);
      pomelo.request(
        'chat.roomDebanHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:deban error: ', response);
          }
        }
      );
    },
    roomViewed: function (roomId, events) {
      var data = {room_id: roomId, events: events};
      pomelo.notify('chat.roomViewedHandler.call', data);
      debug('io:out:room:viewed', data);
    },
    roomMessageSpam: function (roomId, messageId) {
      var data = {room_id: roomId, event: messageId};
      debug('io:out:room:message:spam', data);
      pomelo.request(
        'chat.roomMessageSpamHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:message:spam: ', response);
          }
        }
      );
    },
    roomMessageUnspam: function (roomId, messageId) {
      var data = {room_id: roomId, event: messageId};
      debug('io:out:room:message:unspam', data);
      pomelo.request(
        'chat.roomMessageUnspamHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:room:message:unspam: ', response);
          }
        }
      );
    },
    roomTyping: function (roomId) {
      var data = {room_id: roomId};
      debug('io:out:room:typing', data);
      pomelo.notify('chat.roomTypingHandler.call', data);
    },
    roomRequestAllowance: function (roomId, fn) {
      var data = {room_id: roomId};
      debug('io:out:room:request:allowance', data);
      pomelo.request(
        'chat.roomRequestAllowance.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:room:request:allowance error: ', response);
          } else {
            debug('io:in:room:request:allowance', response);
          }
          return fn(response);
        }
      );
    },

    // ONETOONE
    // ======================================================

    userJoin: function (username) {
      var data = {username: username};
      debug('io:out:user:join', data);
      pomelo.request(
        'chat.userJoinHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:user:join error: ', response);
          }
        }
      );
    },
    userLeave: function (userId) {
      var data = {user_id: userId};
      pomelo.notify('chat.userLeaveHandler.call', data);
      debug('io:out:user:leave', data);
    },
    userBan: function (userId, username) {
      var data;
      if (userId) {
        data = {user_id: userId};
      } else if (username) {
        data = {username: username};
      } else {
        return;
      }
      debug('io:out:user:ban', data);
      pomelo.request(
        'chat.userBanHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:user:ban error: ', response);
          }
        }
      );
    },
    userDeban: function (userId, username) {
      var data;
      if (userId) {
        data = {user_id: userId};
      } else if (username) {
        data = {username: username};
      } else {
        return;
      }
      debug('io:out:user:deban', data);
      pomelo.request(
        'chat.userDebanHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:user:deban error: ', response);
          }
        }
      );
    },
    userMessage: function (userId, username, message, images, callback) {
      var data = {message: message, images: images};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      debug('io:out:user:message', data);
      pomelo.request(
        'chat.userMessageHandler.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:user:message error: ', response);
          }
          if (_.isFunction(callback)) {
            return callback(response);
          }
        }
      );
    },
    userMe: function (userId, message, callback) {
      var data = {user_id: userId, message: message};
      debug('io:out:user:me', data);
      pomelo.request(
        'chat.userMeHandler.call',
        data,
        function (response) {
          debug('io:in:user:me', response);
          if (_.isFunction(callback)) {
            return callback(response);
          }
        }
      );
    },
    userMessageEdit: function (userId, messageId, message) {
      var data = {user_id: userId, event: messageId, message: message};
      pomelo.notify('chat.userMessageEditHandler.call', data);
      debug('io:out:user:message:edit', data);
    },
    userRead: function (userId, username, fn) {
      var data = {};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }

      debug('io:out:user:read', data);
      pomelo.request(
        'chat.userReadHandler.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:user:read error: ', response);
          } else {
            debug('io:in:user:read', response);
          }

          return fn(response.err, response);
        }
      );
    },
    userUpdate: function (fields, fn) {
      var data = {data: fields};
      debug('io:out:user:update', data);
      pomelo.request(
        'chat.userUpdateHandler.call',
        data,
        function (response) {
          debug('io:in:user:update', response);
          return fn(response);
        }
      );
    },
    userHistory: function (userId, since, limit, fn) {
      var data = {user_id: userId, since: since, limit: limit};
      debug('io:out:user:history', data);
      pomelo.request(
        'chat.userHistoryHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:user:history error: ', response);
          }

          debug('io:in:user:history', response);
          return fn(response);
        }
      );
    },
    userViewed: function (userId, events) {
      var data = {user_id: userId, events: events};
      pomelo.notify('chat.userViewedHandler.call', data);
      debug('io:out:user:viewed', data);
    },
    userTyping: function (userId) {
      var data = {user_id: userId};
      debug('io:out:user:typing', data);
      pomelo.notify('chat.userTypingHandler.call', data);
    },

    // PREFERENCES
    // ======================================================

    userPreferencesRead: function (roomId, fn) {
      var data = (roomId) ? {room_id: roomId} : {};
      debug('io:out:user:preferences:read', data);
      pomelo.request(
        'chat.preferencesReadHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:user:preferences:read error: ', response);
          }

          debug('io:in:user:preferences:read', response);
          return fn(response);
        }
      );
    },
    userPreferencesUpdate: function (fields, callback) {
      var data = {data: fields};
      debug('io:out:preferences:update', data);
      pomelo.request(
        'chat.preferencesUpdateHandler.call',
        data,
        function (response) {
          debug('io:in:preferences:update', response);
          if (_.isFunction(callback)) {
            return callback(response);
          }
        }
      );
    },
    accountEmail: function (email, fn) {
      var data = {email: email};
      pomelo.request(
        'chat.accountEmailHandler.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:account:email:edit error: ', response);
          } else {
            debug('io:in:account:email:edit', response);
          }
          return fn(response);
        });
    },
    accountPassword: function (newPassword, currentPassword, fn) {
      var data = {password: newPassword, current_password: currentPassword};
      pomelo.request(
        'chat.accountPasswordHandler.call',
        data,
        function (response) {
          if (response.err) {
            debug('io:in:account:password:edit error: ', response);
          } else {
            debug('io:in:account:password:edit', response);
          }
          return fn(response);
        });
    },

    // NOTIFICATION
    // ======================================================

    notificationRead: function (viewed, time, number, fn) {
      var data = {viewed: viewed, time: time, number: number};
      debug('io:out:notification:read', data);
      pomelo.request(
        'chat.notificationReadHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:notification:read error: ', response);
          }

          debug('io:in:notification:read', response);
          return fn(response);
        }
      );
    },
    notificationViewed: function (ids, all, fn) {
      var data = {ids: ids, all: all};
      debug('io:out:notification:viewed', data);
      pomelo.request(
        'chat.notificationViewedHandler.call',
        data,
        function (response) {
          if (response.err) {
            return debug('io:in:notification:viewed error: ', response);
          }

          debug('io:in:notification:viewed', response);
          return fn(response);
        }
      );
    },
    notificationDone: function (id) {
      var data = {id: id};
      pomelo.notify('chat.notificationDoneHandler.call', data);
      debug('io:out:notification:done', data);
    }

  }, Backbone.Events);

  client.initialize();
  return client;
});
