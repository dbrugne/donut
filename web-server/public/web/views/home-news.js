var Backbone = require('backbone');

var HomeNewsView = Backbone.View.extend({
  template: require('../templates/home-news.html'),

  events: {
    'click .close': 'onClose'
  },

  initialize: function (options) {

  },
  render: function (list) {
    // @todo check from settings if not already read
    var html = this.template({
      list: list
    });

    this.$el.html(html);
    this.$el.removeClass('hidden');

    return this;
  },

  onClose: function (event) {
    this.$el.addClass('hidden'); // @todo add slideup effect
    // @todo save state on currentUser
  },

  _remove: function () {
    this.remove();
  }
});

module.exports = HomeNewsView;
