var Backbone = require('backbone');

var GroupModel = Backbone.Model.extend({
  defaults: function () {
    return {
      type: 'group',
      focused: false
    };
  },
  initialize: function () {
  }
});

module.exports = GroupModel;
