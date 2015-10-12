var _ = require('underscore');
var Backbone = require('backbone');
var app = require('./app');
var client = require('../libs/client');
var currentUser = require('./current-user');
var UserModel = require('./user');
var EventModel = require('./event');
var RoomUsersCollection = require('../collections/room-users');

var RoomModel = Backbone.Model.extend({
  defaults: function () {
    return {
      name: '',
      op: [],
      devoices: [],
      topic: '',
      avatar: '',
      poster: '',
      posterblured: '',
      color: '',
      type: 'room',
      focused: false,
      unviewed: false,
      newmention: false,
      newuser: false,
      blocked: false
    };
  },

  initialize: function () {
    this.users = new RoomUsersCollection();
  },
  getIdentifier: function () {
    return this.get('name');
  },
  addUser: function (data, sort) {
    sort = !!sort;

    // already in?
    var model = this.users.get(data.user_id);
    if (model) {
      // not sure this update is used in any case, but it's not expensive
      model.set('avatar', data.avatar);
      model.set('color', data.color);
      return model;
    }

    var is_owner = (this.get('owner_id') && this.get('owner_id') === data.user_id);

    var is_op = (this.get('op') && this.get('op').indexOf(data.user_id) !== -1);

    model = new UserModel({
      id: data.user_id,
      user_id: data.user_id,
      username: data.username,
      avatar: data.avatar,
      color: data.color,
      is_owner: is_owner,
      is_op: is_op,
      is_devoice: this.userIsDevoiced(data.user_id),
      status: data.status
    });
    this.users.add(model, {sort: sort});
    return model;
  },
  getUrl: function () {
    return window.location.protocol +
      '//' +
      window.location.host +
      '/r/' + this.getIdentifier();
  },
  leave: function () {
    client.roomLeave(this.get('id'));
  },
  userIsDevoiced: function (userId) {
    return (this.get('devoices') && this.get('devoices').indexOf(userId) !== -1);
  },
  currentUserIsOwner: function () {
    if (!this.get('owner_id')) {
      return false;
    }
    return (this.get('owner_id') === currentUser.get('user_id'));
  },
  currentUserIsOp: function () {
    return (this.get('op') && this.get('op').indexOf(currentUser.get('user_id')) !== -1);
  },
  currentUserIsAdmin: function () {
    return currentUser.isAdmin();
  },
  onIn: function (data) {
    data.status = 'online'; // only an online user can join a room

    this.addUser(data, true);
    this.set('users_number', this.get('users_number') + 1);
    this.users.trigger('users-redraw');

    var model = new EventModel({
      type: 'room:in',
      data: data
    });
    app.trigger('unviewedInOut', model, this);
    this.trigger('freshEvent', model);
  },
  onOut: function (data) {
    var user = this.users.get(data.user_id);

    if (!user) {
      // if user has more that one socket we receive n room:out
      return;
    }
    this.users.remove(user);
    this.set('users_number', this.get('users_number') - 1);
    this.users.trigger('users-redraw');

    var model = new EventModel({
      type: 'room:out',
      data: data
    });
    app.trigger('unviewedInOut', model, this);
    this.trigger('freshEvent', model);
  },
  onTopic: function (data) {
    this.set('topic', data.topic);
    var model = new EventModel({
      type: 'room:topic',
      data: data
    });

    if (currentUser.get('user_id') !== model.get('data').user_id) {
      model.set('unviewed', true);
    }

    app.trigger('unviewedMessage', model, this);
    this.trigger('freshEvent', model);
  },
  onMessage: function (data) {
    var model = new EventModel({
      type: 'room:message',
      data: data
    });

    if (currentUser.get('user_id') !== model.get('data').user_id) {
      model.set('unviewed', true);
    }

    this.set('last', Date.now());
    app.trigger('refreshRoomsList');

    app.trigger('unviewedMessage', model, this);
    this.trigger('freshEvent', model);
  },
  onOp: function (data) {
    // room.get('op')
    var ops = this.get('op');
    ops.push(data.user_id);
    this.set('op', ops);

    // user.get('is_op')
    var user = this.users.get(data.user_id);
    if (user) {
      user.set({is_op: true});
    }
    this.users.sort();

    this.users.trigger('users-redraw');

    var model = new EventModel({
      type: 'room:op',
      data: data
    });
    this.trigger('freshEvent', model);
  },
  onDeop: function (data) {
    // room.get('op')
    var ops = _.reject(this.get('op'), function (opUserId) {
      return (opUserId === data.user_id);
    });
    this.set('op', ops);

    // user.get('is_op')
    var user = this.users.get(data.user_id);
    if (user) {
      user.set({is_op: false});
    }
    this.users.sort();

    this.users.trigger('users-redraw');

    var model = new EventModel({
      type: 'room:deop',
      data: data
    });
    this.trigger('freshEvent', model);
  },
  onDeban: function (data) {
    var model = new EventModel({
      type: 'room:deban',
      data: data
    });
    this.trigger('freshEvent', model);
  },
  onVoice: function (data) {
    var user = this.users.get(data.user_id);
    if (user) {
      user.set({is_devoice: false});
    }

    var devoices = this.get('devoices');
    if (devoices.length) {
      this.set('devoices', _.reject(devoices, function (element) {
        return (element === data.user_id);
      }));
    }

    this.users.sort();
    this.users.trigger('users-redraw');

    // message event room:voice
    var model = new EventModel({
      type: 'room:voice',
      data: data
    });
    this.trigger('freshEvent', model);

    if (currentUser.get('user_id') === data.user_id) {
      this.trigger('inputActive');
    }
  },
  onDevoice: function (data) {
    var user = this.users.get(data.user_id);
    if (user) {
      user.set({is_devoice: true});
    }

    var devoices = this.get('devoices') || [];
    devoices.push(data.user_id);
    this.set('devoices', devoices);

    this.users.sort();
    this.users.trigger('users-redraw');

    // message event room:devoice
    var model = new EventModel({
      type: 'room:devoice',
      data: data
    });
    this.trigger('freshEvent', model);

    if (currentUser.get('user_id') === data.user_id) {
      this.trigger('inputActive');
    }
  },
  onUpdated: function (data) {
    var that = this;
    _.each(data.data, function (value, key, list) {
      that.set(key, value);
    });
  },
  _onStatus: function (expect, data) {
    var model = this.users.get(data.user_id);

    if (!model) {
      return;
    }

    if (model.get('status') === expect) {
      return;
    }

    model.set({status: expect});

    var event = new EventModel({
      type: 'user:' + expect,
      data: data
    });
    this.trigger('freshEvent', event);
  },
  onUserOnline: function (data) {
    this._onStatus('online', data);

    data.status = 'online';
    this.addUser(data, true);
    this.users.trigger('users-redraw');
  },
  onUserOffline: function (data) {
    this._onStatus('offline', data);
  },
  history: function (start, end, callback) {
    client.roomHistory(this.get('room_id'), start, end, 100, function (data) {
      return callback(data);
    });
  },
  viewedElements: function (elements) {
    client.roomViewed(this.get('room_id'), elements);
  },
  onViewed: function (data) {
    this.resetNew();
    this.trigger('viewed', data);
  },
  fetchUsers: function (callback) {
    var that = this;
    client.roomUsers(this.get('id'), {
      type: 'users',
      status: 'online'
    }, function (data) {
      that.users.reset();

      _.each(data.users, function (element, key, list) {
        that.addUser(element, false); // false: avoid automatic sorting on
                                      // each model .add()
      });

      var maxOfflineUsersToDisplay = (15 - data.count > 0)
        ? 15 - data.count
        : 2;
      var searchAttributes = {
        type: 'users',
        status: 'offline',
        selector: {start: 0, length: maxOfflineUsersToDisplay}
      };
      client.roomUsers(that.get('id'), searchAttributes, function (data) {
        _.each(data.users, function (element, key, list) {
          that.addUser(element, false); // false: avoid automatic sorting on
                                        // each model .add()
        });

        that.users.sort(); // sort after batch addition to collection to avoid
        // performance issue

        that.users.trigger('users-redraw');
        if (callback) {
          return callback();
        }
      });
    });
  },
  sendMessage: function (message, files) {
    client.roomMessage(this.get('id'), message, files);
  },
  resetNew: function () {
    if (this.isThereNew()) { // avoid redraw if nothing to change
      this.set('unviewed', false);
      this.set('newmention', false);
      this.set('newuser', false);
      app.trigger('redraw-block');
    }
  },
  isThereNew: function () {
    return !!(this.get('unviewed') || this.get('newmention') || this.get('newuser'));
  },
  isInputActive: function () {
    return !(this.userIsDevoiced(currentUser.get('user_id')));
  }

});

module.exports = RoomModel;
