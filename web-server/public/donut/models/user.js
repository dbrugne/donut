define([
  'underscore',
  'backbone',
  'jquery',
  'models/client'
], function (_, Backbone, $, client) {
  var UserModel = Backbone.Model.extend({

    defaults: function() {
      return {
        user_id: '',
        username: '',
        avatar: '',
        status: ''
      };
    },

    initialize: function(options) {
      this._initialize();
    },

    _initialize: function(options) {
      this.listenTo(client, 'user:updated', this.onUpdated);
    },

    onUpdated: function(data) {
      if (data.username != this.get('username'))
        return;

      var that = this;
      _.each(data.data, function(value, key, list) {
        that.set(key, value);
      });
    }

  });

  return UserModel;
});