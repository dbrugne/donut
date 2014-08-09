define([
  'underscore',
  'backbone',
  'models/client',
  'models/user'
], function (_, Backbone, client, UserModel) {
  var CurrentUserModel = UserModel.extend({

    initialize: function(options) {
      this.listenTo(client, 'welcome', this.onWelcome);

      var that = this;
      this.listenTo(client, 'online',     function() { that.set('status', 'online'); });
      this.listenTo(client, 'connecting', function() { that.set('status', 'connecting'); });
      this.listenTo(client, 'offline',    function() { that.set('status', 'offline'); });
      this.listenTo(client, 'error',      function() { that.set('status', 'error'); });

      this._initialize(options);
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