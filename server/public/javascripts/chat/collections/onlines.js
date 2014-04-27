define([
  'underscore',
  'backbone',
  'models/client',
  'collections/users'
], function (_, Backbone, client, UsersCollection) {
  var OnlineUsersCollection = UsersCollection.extend({

    initialize: function() {
      this.listenTo(client, 'user:online', this.onOnline);
      this.listenTo(client, 'user:offline', this.onOffline);
    },

    onOnline: function(data) {
      this.add({
        id: data.id,
        username: data.username,
        avatar: data.avatar
      });
    },

    onOffline: function(data) {
      var user = this.get(data.id);
      if (user == undefined) {
        return;
      }
      this.remove(user);
    }

  });

  return new OnlineUsersCollection();
});