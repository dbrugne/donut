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

      this.add(model); // now the view exists (created by mainView)

      // Add history
      if (user.history) {
        _.each(user.history, function(event) {
          if (event.type != 'user:message') return;
          model.messages.add(new MessageModel(event));
        });
        model.trigger('separator', '^^ Previous messages ^^');
      }
    },
    onClose: function(data) {
      var model = this.get(data.user_id);
      if (model) {
        this.remove(model);
      }
    },
    onMessage: function(message) {
      // Current user is emitter or recipient?
      var with_user_id;
      if (currentUser.get('user_id') == message.user_id) {
        // Emitter
        with_user_id = message.to_user_id;
      } else if (currentUser.get('user_id') == message.to_user_id) {
        // Recipient
        with_user_id = message.user_id; // i can also be this one if i spoke to myself...
      }

      // Find or create the model
      var model = this.findWhere({user_id: with_user_id}); // @todo : how to get the message history in this case ???
      if (model == undefined) {
        var model = new OneToOneModel({
          id: with_user_id,
          user_id: with_user_id,
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