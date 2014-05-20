define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/onetoone'
], function (_, Backbone, client, currentUser, OneToOneModel) {
  var OnetoonesCollection = Backbone.Collection.extend({

    initialize: function() {
      this.listenTo(client, 'user:open', this.openPong);
      this.listenTo(client, 'user:message', this.onMessage);
    },
    openPing: function(username) {
      client.open(username);
    },
    openPong: function(user) {
      var model = new OneToOneModel({
        id: user.user_id,
        user_id: user.user_id,
        username: user.username
      });

      this.add(model);
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
      var model = this.findWhere({username: with_username});
      if (model == undefined) {
        var model = new OneToOneModel({
          id: with_username,
          user_id: with_username,
          username: message.username
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