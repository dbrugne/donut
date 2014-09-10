define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/onetoone',
  'models/message'
], function (_, Backbone, client, currentUser, OneToOneModel, MessageModel) {
  var OnetoonesCollection = Backbone.Collection.extend({

    comparator: function(model1, model2) {
      return model1.get('username').toLowerCase()
        .localeCompare(model2.get('username').toLowerCase());
    },

    initialize: function() {
      this.listenTo(client, 'user:close', this.onClose);
      this.listenTo(client, 'user:message', this.onMessage);
    },
    /**
     * Retrieve the current onetoone model OR create a new one
     * @param user
     * @return OnetooneModel
     */
    getModel: function(user) {
      if (!user.username)
        return;

      var model = this.get(user.username);
      if (model == undefined) {
        // a new one
        user.id = user.username;
        model = new OneToOneModel(user);
        this.add(model);

        // async !!
        client.userProfile(user.username);
      } else {
        // an existing one, update field if needed
        _.each(['avatar', 'color'], function(key) {
          if (!_.has(user, key))
            return;

          var current = model.get(key);
          var fresh = user[key];

          if (current != fresh)
            model.set(key, fresh);
        });
      }

      return model;
    },
    onMessage: function(message) {
      var withUser;
      if (currentUser.get('user_id') == message.from_user_id) {
        // i'm emitter
        withUser = {
          username  : message.to_username,
          user_id   : message.to_user_id,
          avatar    : message.to_avatar,
          color     : message.to_color
        };
      } else if (currentUser.get('user_id') == message.to_user_id) {
        // i'm recipient
        withUser = {
          username  : message.from_username,
          user_id   : message.from_user_id,
          avatar    : message.from_avatar,
          color     : message.from_color
        };
      } else {
        return; // visibly something goes wrong
      }

      // Find or create the model
      var model = this.getModel(withUser);

      // Rework message object
      model.message({
        user_id: message.from_user_id,
        username: message.from_username,
        avatar: message.from_avatar,
        time: message.time,
        message: message.message
      });
      this.trigger('newMessage');
    },
    onClose: function(data) {
      var model = this.get(data.user_id);
      if (model) {
        this.remove(model);
      }
    },

  });

  return new OnetoonesCollection();
});