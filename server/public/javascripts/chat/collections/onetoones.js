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
      this.listenTo(client, 'user:open', this.openPong);
      this.listenTo(client, 'user:close', this.onClose);
      this.listenTo(client, 'user:message', this.onMessage);
    },
    openPing: function(username) {
      client.open(username);
    },
    openPong: function(user) {
      var model = new OneToOneModel({
        id: user.user_id,
        user_id: user.user_id,
        username: user.username,
        avatar: user.avatar
      });

      this.add(model);

      // Display history messages
      _.each(user.history, function(message) {
        if (message.to_user_id == currentUser.get('user_id')) {
          message.username = currentUser.get('username');
          message.avatar = currentUser.get('avatar');
        } else {
          message.username = message.to;
          message.avatar = model.get('avatar');
        }

        delete message.to;
        model.messages.add(new MessageModel(message));
      });
      model.trigger('separator', '^^ Previous messages ^^');
    },
    onClose: function(data) {
      var model = this.get(data.user_id);
      if (model) {
        this.remove(model);
      }
    },
    onMessage: function(message) {
      // Current user is emitter or recipient?
      var with_username;
      if (currentUser.get('username') == message.from) {
        // Emitter
        with_username = message.to;
      } else if (currentUser.get('username') == message.to) {
        // Recipient
        with_username = message.from; // i can also be this one if i spoke to myself...
      }

      // Find or create the model
      var model = this.findWhere({username: with_username}); // @todo : how to get the message history in this case ???
      if (model == undefined) {
        var model = new OneToOneModel({
          id: with_username,
          user_id: with_username,
          username: message.username,
          avatar: message.avatar
        });
        this.add(model);
      }

      model.message(message);
      // Window new message indication
      this.trigger('newMessage');
    }

  });

  return new OnetoonesCollection();
});