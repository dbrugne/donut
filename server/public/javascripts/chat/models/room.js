define([
  'underscore',
  'backbone',
  'models/client',
  'models/discussion',
  'models/user',
  'collections/users'
], function (_, Backbone, client, DiscussionModel, UserModel, UsersCollection) {
  var RoomModel = DiscussionModel.extend({

    defaults: function() {
      return {
        name: '',
        topic: '',
        permanent: false,
        avatar: '',
        color: '#fff',
        type: 'room', // @todo : remove
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
    },
    leave: function(model, collection, options) {
      client.leave(model.get('name'));
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
      if (data.name != this.get('name')) {
        return;
      }
      this.set('permanent', data.permanent);
    }

  });

  return RoomModel;
});