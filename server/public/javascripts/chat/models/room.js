define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/discussion',
  'models/user',
  'collections/users'
], function (_, Backbone, client, currentUser, DiscussionModel, UserModel, UsersCollection) {
  var RoomModel = DiscussionModel.extend({

    defaults: function() {
      return {
        name: '',
        op: [],
        topic: '',
        permanent: false,
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
      this.users = new UsersCollection();
      this.on('remove', this.leave);
      this.listenTo(client, 'room:in', this.onIn);
      this.listenTo(client, 'room:out', this.onOut);
      this.listenTo(client, 'room:topic', this.onTopic);
      this.listenTo(client, 'room:message', this.onMessage);
      this.listenTo(client, 'room:permanent', this.onPermanent);
      this.listenTo(client, 'room:op', this.onOp);
      this.listenTo(client, 'room:deop', this.onDeop);
    },
    leave: function(model, collection, options) {
      client.leave(model.get('name'));
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
      if (data.name != this.get('name')) return;
      this.message(data);
      // Window new message indication
      this.trigger('newMessage');
    },
    onIn: function(data) {
      if (data.name != this.get('name')) {
        return;
      }
      // already in?
      if (this.users.get(data.user_id)) {
        return;
      }
      var user = new UserModel({
        id: data.user_id,
        user_id: data.user_id,
        username: data.username,
        avatar: data.avatar
      });
      this.users.add(user);
      this.trigger('notification', {
        type: 'in',
        user_id: user.get('id'),
        username: user.get('username'),
        avatar: user.get('avatar')
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

      this.trigger('notification', {
        type: 'out',
        user_id: user.get('id'),
        username: user.get('username'),
        avatar: user.get('avatar')
      });
      this.trigger('inOut');
    },
    onTopic: function(data) {
      if (data.name != this.get('name')) {
        return;
      }
      this.set('topic', data.topic);
      this.trigger('notification', {
        type: 'topic',
        user_id: data.user_id,
        username: data.username,
        avatar: data.avatar,
        topic: data.topic
      });
    },
    onPermanent: function(data) {
      if (data.name != this.get('name'))
        return;

      this.set('permanent', data.permanent);
    },
    onOp: function(data) {
      if (this.get('op').indexOf(data.user_id) !== -1)
        return;

      this.get('op').push(data.user_id);

      this.users.trigger('redraw');

      this.trigger('notification', {
        type: 'op',
        user_id: data.user_id,
        username: data.username,
        avatar: data.avatar,
        by_user_id: data.by_user_id,
        by_username: data.by_username,
        by_avatar: data.by_avatar
      });
    },
    onDeop: function(data) {
      if (data.name != this.get('name'))
        return;

      if (this.get('op').indexOf(data.user_id) === -1)
        return;

      var ops = _.without(this.get('op'), data.user_id);
      this.set('op', ops);

      this.users.trigger('redraw');

      this.trigger('notification', {
        type: 'deop',
        user_id: data.user_id,
        username: data.username,
        avatar: data.avatar,
        by_user_id: data.by_user_id,
        by_username: data.by_username,
        by_avatar: data.by_avatar
      });
    }

  });

  return RoomModel;
});