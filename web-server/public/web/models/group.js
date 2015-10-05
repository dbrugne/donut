var Backbone = require('backbone');
var _ = require('underscore');
var client = require('../libs/client');

var GroupModel = Backbone.Model.extend({
  defaults: function () {
    return {
      type: 'group',
      focused: false
    };
  },
  initialize: function () {
    this.listenTo(client, 'group:updated', this.onUpdated);
  },
  onUpdated: function (data) {
    var that = this;
    _.each(data.data, function (value, key, list) {
      that.set(key, value);
    });
  }
});

module.exports = GroupModel;
