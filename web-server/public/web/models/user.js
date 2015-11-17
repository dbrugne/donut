var _ = require('underscore');
var Backbone = require('backbone');

var UserModel = Backbone.Model.extend({
  defaults: function () {
    return {
      user_id: '',
      username: '',
      avatar: '',
      status: '',
      admin: ''
    };
  },

  initialize: function (options) {
  },

  onUpdated: function (data) {
    _.each(data.data, _.bind(function (value, key, list) {
      this.set(key, value);
    }, this));
  }
});

module.exports = UserModel;
