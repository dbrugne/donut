define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/discussion',
  'models/user',
  'models/event',
  'collections/room-users'
], function (_, Backbone, client, currentUser, DiscussionModel, UserModel, EventModel, RoomUsersCollection) {
  var RoomModel = DiscussionModel.extend({

    defaults: function() {
      return {
        name: '',
        op: [],
        topic: '',
        avatar: '',
        poster: '',
        posterblured: '',
        color: '',
        type: 'room',
        focused: false,
        unread: 0
      };
    },

    _initialize: function() {
      this.users = new RoomUsersCollection();
      this.listenTo(client, 'room:in', this.onIn);
      this.listenTo(client, 'room:out', this.onOut);
      this.listenTo(client, 'room:topic', this.onTopic);
      this.listenTo(client, 'room:message', this.onMessage);
      this.listenTo(client, 'room:op', this.onOp);
      this.listenTo(client, 'room:deop', this.onDeop);
      this.listenTo(client, 'room:updated', this.onUpdated);

      this.listenTo(client, 'user:online', this.onUserOnline);
      this.listenTo(client, 'user:offline', this.onUserOffline);

      this.listenTo(client, 'reconnected', this.onOnline);
      this.listenTo(client, 'disconnected', this.onOffline);
    },
    addUser: function(data) {
      // already in?
      var model = this.users.get(data.user_id);
      if (model) {
        // not sure this update is used in any case, but it's not expensive
        model.set('avatar', data.avatar);
        model.set('color', data.color);
        return model;
      }

      var is_owner = (this.get('owner') && this.get('owner').get('user_id') == data.user_id)
       ? true
       : false;

      var is_op = false;
      if (this.get('op')) {
        _.each(this.get('op'), function(opUser) {
          if (opUser.user_id == data.user_id) {
            is_op = true;
          }
        });
      }

      model = new UserModel({
        id: data.user_id,
        user_id: data.user_id,
        username: data.username,
        avatar: data.avatar,
        color: data.color,
        is_owner: is_owner,
        is_op: is_op,
        status: data.status
      });
      this.users.add(model);
      return model;
    },
    leave: function() {
      client.leave(this.get('name'));
    },
    currentUserIsOwner: function() {
      if (!this.get('owner'))
        return false;

      return (this.get('owner').get('user_id') == currentUser.get('user_id'))
        ? true
        : false;
    },
    currentUserIsOp: function() {
      if (!this.get('op'))
        return false;

      return (this.get('op').indexOf(currentUser.get('user_id')) !== -1)
          ? true
          : false;
    },
    onMessage: function(data) {
      if (data.name != this.get('name'))
        return;

      this.onEvent('room:message', data);
    },
    onIn: function(data) {
      if (data.name != this.get('name')) {
        return;
      }

      data.status = 'online'; // only an online user can join a room
      var user = this.addUser(data);

      this.events.addEvent({
        type: 'room:in',
        data: data
      });
      this.trigger('inOut');
    },
    onOut: function(data) {
      if (data.name != this.get('name')) {
        return;
      }
      var user = this.users.get(data.user_id);

      if (!user) return; // if user has more that one socket we receive n room:out

      this.users.remove(user);

      this.events.addEvent({
        type: 'room:out',
        data: data
      });
      this.trigger('inOut');
    },
    onTopic: function(data) {
      if (data.name != this.get('name')) {
        return;
      }
      this.set('topic', data.topic);
      this.events.addEvent({
        type: 'room:topic',
        data: data
      });
    },
    onOp: function(data) {
      if (data.name != this.get('name'))
        return;

      if (this.get('op').indexOf(data.user_id) !== -1)
        return;

      // room.get('op')
      this.get('op').push(data.user_id);

      // user.get('is_op')
      var user = this.users.get(data.user_id);
      if (!user)
        return;
      user.set({is_op: true});
      this.users.sort();

      this.users.trigger('redraw');

      this.events.addEvent({
        type: 'room:op',
        data: data
      });
    },
    onDeop: function(data) {
      if (data.name != this.get('name'))
        return;

      if (this.get('op').indexOf(data.user_id) === -1)
        return;

      // room.get('op')
      var ops = _.without(this.get('op'), data.user_id);
      this.set('op', ops);

      // user.get('is_op')
      var user = this.users.get(data.user_id);
      if (!user)
        return;
      user.set({is_op: false});
      this.users.sort();

      this.users.trigger('redraw');

      this.events.addEvent({
        type: 'room:deop',
        data: data
      });
    },
    onUpdated: function(data) {
      if (data.name != this.get('name'))
        return;

      var that = this;
      _.each(data.data, function(value, key, list) {
        that.set(key, value);
      });
    },
    onOnline: function() {
      this.events.addEvent({
        type: 'reconnected'
      });
    },
    onOffline: function() {
      this.events.addEvent({
        type: 'disconnected'
      });
    },
    getUrl: function() {
      return window.location.protocol
        +'//'+window.location.host
        +'/room/'
        +this.get('name').replace('#', '').toLocaleLowerCase();
    },
    _onStatus: function(expect, data) {
      var model = this.users.get(data.user_id);
      if (!model)
        return;

      if (model.get('status') == expect)
        return;

      model.set({status: expect});

      this.events.addEvent({
        type: expect,
        data: data
      });
    },
    onUserOnline: function(data) {
      this._onStatus('online', data);
    },
    onUserOffline: function(data) {
      this._onStatus('offline', data);
    }

  });

  return RoomModel;
});