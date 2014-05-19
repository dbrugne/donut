define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/onetoone',
  'models/user'
], function (_, Backbone, client, currentUser, OneToOneModel, UserModel) {
  var OnetoonesCollection = Backbone.Collection.extend({

    initialize: function() {
      this.listenTo(client, 'user:open', this.userOpen);
      this.listenTo(client, 'user:message', this.userMessage);
    },

    userOpen: function(data) {
      var onetoone = this.addOneToOne(new UserModel({
        id: data.user_id,
        username: data.username
      }));
      this.focus(onetoone);
    },

    userMessage: function(message) {
      // Current user is emitter or recipient?
      var with_user_id;
      if (currentUser.get('user_id') == message.from) {
        // Emitter
        with_user_id = message.to;
      } else if (currentUser.get('user_id') == message.to) {
        // Recipient
        with_user_id = message.from; // i can also be this one if i spoke to myself...
      }

      model = this.addOneToOne(new UserModel({
        id: with_user_id,
        username: message.username
      }));

      // To have the same data between room and user messages (= same view code)
      message.user_id = message.from;

      model.message(message);

      // Window new message indication
      this.trigger('newMessage');
    },

    addOneToOne: function(user) {
      // Discussion already opened?
      var oneToOneId = user.get('id');
      var model = this.get(oneToOneId);
      if (model == undefined) {
        model = new OneToOneModel({
          id: oneToOneId,
          user_id: user.get('id'),
          username: user.get('username')
        });
        this.add(model);
      }

      return model;
    }

  });

  return new OnetoonesCollection();
});