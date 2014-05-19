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
      model = new OneToOneModel({
        id: user.user_id,
        user_id: user.user_id,
        username: user.username
      });

      this.add(model);
    },
    onMessage: function(message) {
      // Current user is emitter or recipient?
      var with_user_id;
      if (currentUser.get('username') == message.from) {
        // Emitter
        with_user_id = message.to;
      } else if (currentUser.get('username') == message.to) {
        // Recipient
        with_user_id = message.from; // i can also be this one if i spoke to myself...
      }

      // @todo : case when i receive message from another user and discussio is not already open
//      model = this.addOneToOne(new UserModel({
//        id: with_user_id,
//        username: message.username
//      }));

//      // To have the same data between room and user messages (= same view code)
//      message.user_id = message.from;

      model.message(message);

      // Window new message indication
      this.trigger('newMessage');
    }

  });

  return new OnetoonesCollection();
});