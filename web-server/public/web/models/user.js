var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');

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
    // @todo dbr : performance leak, should be handled by rooms and onetoones
    this.listenTo(client, 'user:updated', this.onUpdated);
  },

  onUpdated: function (data) {
    if (data.user_id !== this.get('user_id')) {
      return;
    }
    _.each(data.data, _.bind(function (value, key, list) {
      this.set(key, value);
    }, this));
  }
});

module.exports = UserModel;
