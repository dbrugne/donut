define([
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'models/user',
  'models/event',
  'collections/room-users'
], function (_, Backbone, client, currentUser, UserModel, EventModel, RoomUsersCollection) {
  var RoomModel = Backbone.Model.extend({

    defaults: function() {
      return {
        name          : '',
        op            : [],
        topic         : '',
        avatar        : '',
        poster        : '',
        posterblured  : '',
        color         : '',
        type          : 'room',
        focused       : false,
        unread        : 0, // probably not needed in future
        newmessage    : false,
        newmention    : false,
        newuser       : false
      };
    },

    initialize: function() {
      this.users = new RoomUsersCollection();
    },
    getIdentifier: function() {
      return this.get('name');
    },
    addUser: function(data, sort) {
      sort = (sort === false) ? false : true;

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
      if (this.get('op') && this.get('op').indexOf(data.user_id) !== -1)
        is_op = true;

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
    getUrl: function() {
      return window.location.protocol
        +'//'+window.location.host
        +'/room/'
        +this.get('name').replace('#', '').toLocaleLowerCase();
    },
    leave: function() {
      client.roomLeave(this.get('name'));
    },
    userIsDevoiced: function(userId) {
      if (!this.get('devoices') || !this.get('devoices').length)
        return false;
      var subDocument = _.find(this.get('devoices'), function (devoice) {
        if (devoice.user.toString() == userId)
          return true;
      });

      return (typeof subDocument != 'undefined');
    },
    currentUserIsOwner: function() {
      if (!this.get('owner'))
        return false;

      return (this.get('owner').get('user_id') == currentUser.get('user_id'))
        ? true
        : false;
    },
    currentUserIsOp: function() {
      return (this.get('op') && this.get('op').indexOf(currentUser.get('user_id')) !== -1);
    },
    currentUserIsAdmin: function() {
      return currentUser.isAdmin();
    },
    onIn: function(data) {
      data.status = 'online'; // only an online user can join a room

      this.addUser(data);
      this.users.trigger('users-redraw');

      var model = new EventModel({
        type: 'room:in',
        data: data
      });
      client.roomVoice(data.name, data.username);
      this.trigger('freshEvent', model);
    },
    onOut: function(data) {
      var user = this.users.get(data.user_id);

      if (!user)
        return; // if user has more that one socket we receive n room:out

      this.users.remove(user);
      this.users.trigger('users-redraw');

      var model = new EventModel({
        type: 'room:out',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onTopic: function(data) {
      this.set('topic', data.topic);
      var model = new EventModel({
        type: 'room:topic',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onMessage: function(data) {
      var model = new EventModel({
        type: 'room:message',
        data: data
      });

      if (currentUser.get('user_id') != model.get('data').user_id)
        model.set('unviewed', true);

      this.trigger('freshEvent', model);
    },
    onOp: function(data) {
      // room.get('op')
      var ops = this.get('op');
      ops.push(data.user_id);
      this.set('op', ops);

      // user.get('is_op')
      var user = this.users.get(data.user_id);
      if (user)
        user.set({is_op: true});
      this.users.sort();

      this.users.trigger('users-redraw');

      var model = new EventModel({
        type: 'room:op',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onDeop: function(data) {
      // room.get('op')
      var ops = _.reject(this.get('op'), function(opUserId) {
        return (opUserId == data.user_id);
      });
      this.set('op', ops);

      // user.get('is_op')
      var user = this.users.get(data.user_id);
      if (user)
        user.set({is_op: false});
      this.users.sort();

      this.users.trigger('users-redraw');

      var model = new EventModel({
        type: 'room:deop',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onDeban: function(data) {
      var model = new EventModel({
        type: 'room:deban',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onVoice: function(data) {

      // user.get('is_devoice')
      var user = this.users.get(data.user_id);
      if (user)
        user.set({is_devoice: false});
      this.users.sort();

      this.users.trigger('users-redraw');
      this.trigger('inputActive', data.user_id);
    },
    onDevoice: function(data) {

      // user.get('is_devoice')
      var user = this.users.get(data.user_id);
      if (user)
        user.set({is_devoice: true});
      this.users.sort();

      this.users.trigger('users-redraw');
      this.trigger('inputActive',  data.user_id);
    },
    onUpdated: function(data) {
      var that = this;
      _.each(data.data, function(value, key, list) {
        that.set(key, value);
      });
    },
    _onStatus: function(expect, data) {
      var model = this.users.get(data.user_id);

      if (!model)
        return;

      if (model.get('status') == expect)
        return;

      model.set({status: expect});

      var model = new EventModel({
        type: 'user:'+expect,
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onUserOnline: function(data) {
      this._onStatus('online', data);
    },
    onUserOffline: function(data) {
      this._onStatus('offline', data);
    },
    history: function(since, callback) {
      client.roomHistory(this.get('name'), since, 100, function(data) {
        return callback(data);
      });
    },
    viewedElements: function(elements) {
      client.roomViewed(this.get('name'), elements);
    },
    onViewed: function (data) {
      this.trigger('viewed', data);
    },
    fetchUsers: function() {
      var that = this;
      client.roomUsers(this.get('name'), function(data) {
        that.users.reset();

        _.each(data.users, function(element, key, list) {
          that.addUser(element, false); // false: avoid automatic sorting on each model .add()
        });
        that.users.sort(); // sort after batch addition to collection to avoid performance issue
        that.users.trigger('users-redraw');
      });
    },

    sendMessage: function(message, images) {
      client.roomMessage(this.get('name'), message, images);
    },

    resetNew: function() {
      this.set('unread', 0);
      this.set('newmessage', false);
      this.set('newmention', false);
      this.set('newuser', false);
    },
    isThereNew: function() {
      return !!(this.get('newmessage') || this.get('newmention') || this.get('newuser'));
    },
    isInputActive: function(userId) {
      if (this.userIsDevoiced(userId))
        return false;
      return true;
    }

  });

  return RoomModel;
});