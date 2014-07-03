define([
  'underscore',
  'backbone',
  'models/client',
  'models/user'
], function (_, Backbone, client, UserModel) {
  var CurrentUserModel = UserModel.extend({

    initialize: function(options) {
      this.listenTo(client, 'welcome', this.onWelcome);
    },
    /**
     * Executed each time the connexion with server is re-up (can occurs multiple
     * time in a same session)
     * @param data
     */
    onWelcome: function(data) {
      this.set(data.user);
    }

  });

  return new CurrentUserModel();
});