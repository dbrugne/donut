define([
  'underscore',
  'backbone',
  'models/client',
  'collections/users'
], function (_, Backbone, client, UsersCollection) {
  var OnlineUsersCollection = UsersCollection.extend({

    comparator: function(model1, model2) {
      return model1.get('username').toLowerCase()
        .localeCompare(model2.get('username').toLowerCase());
    },
    initialize: function() {
      this.listenTo(client, 'user:online', this.onOnline);
      this.listenTo(client, 'user:offline', this.onOffline);
    },
    onOnline: function(data) {
      this.add({
        id: data.user_id,
        username: data.username
      });
    },
    onOffline: function(data) {
      var user = this.get(data.user_id);
      if (user == undefined) {
        return;
      }
      this.remove(user);
    }

  });

  return new OnlineUsersCollection();
});