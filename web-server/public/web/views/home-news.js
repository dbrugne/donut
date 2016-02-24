var Backbone = require('backbone');
var app = require('../libs/app');
var debug = require('../libs/donut-debug')('donut:home-news');
var date = require('../libs/date');

var HomeNewsView = Backbone.View.extend({
  template: require('../templates/home-news.html'),

  events: {
    'click .close-news': 'onClose'
  },

  initialize: function (options) {

  },
  render: function () {
    var lastNewsDate = new Date('2016-02-23 00:00:00'); // fetch this from news
    var diff = date.diff(lastNewsDate, app.user.get('last_news'));
    var html = '';
    if (diff > 0) {
      html = this.template();
    }

    this.$el.html(html);
    this.$el.removeClass('hidden');

    return this;
  },

  onClose: function (event) {
    this.$el.slideUp(); // @todo add slideup effect
    var updateData = { last_news: Date.now() };
    app.client.userUpdate(updateData, function (data) {
      if (data.err) {
        debug('error while saving user ', data.err);
        console.log(data.err);
      }
    });
  },

  _remove: function () {
    this.remove();
  }
});

module.exports = HomeNewsView;
