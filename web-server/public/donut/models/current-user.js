define([
  'underscore',
  'backbone',
  'models/client',
  'models/user'
], function (_, Backbone, client, UserModel) {
  var CurrentUserModel = UserModel.extend({

    initialize: function(options) {
      var that = this;
      this.listenTo(client, 'connecting', function() { that.set('status', 'connecting'); });
      this.listenTo(client, 'connected',     function() { that.set('status', 'online'); });
      this.listenTo(client, 'disconnected',    function() { that.set('status', 'offline'); });
      this.listenTo(client, 'reconnected',     function() { that.set('status', 'online'); });
      this.listenTo(client, 'error',      function() { that.set('status', 'error'); });

      this._initialize(options);
    }

  });

  return new CurrentUserModel();
});