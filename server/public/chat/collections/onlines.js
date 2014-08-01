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
      this.listenTo(client, 'home', this.onHome);
//      this.listenTo(client, 'user:online', this.onOnline); // now list is rendered by home message, but this could will be helpful later
//      this.listenTo(client, 'user:offline', this.onOffline); // now list is rendered by home message, but this could will be helpful later
    },
    onHome: function(data) {
      var collection = this;
      _.each(data.onlines, function(online) {
        collection.remove(collection.get(online.user_id));
        collection.add({
          id: online.user_id,
          user_id: online.user_id,
          username: online.username,
          avatar: online.avatar,
          color: online.color,
          bio: online.bio,
          location: online.location,
          website: online.website
        });
      });
    }
//    onOnline: function(data) { // now list is rendered by home message, but this could will be helpful later
//      this.add({
//        id: data.user_id,
//        username: data.username,
//        avatar: data.avatar
//      });
//    },
//    onOffline: function(data) { // now list is rendered by home message, but this could will be helpful later
//      var user = this.get(data.user_id);
//      if (user == undefined) {
//        return;
//      }
//      this.remove(user);
//    }

  });

  return new OnlineUsersCollection();
});