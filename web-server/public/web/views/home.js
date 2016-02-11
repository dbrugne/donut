var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var CardsView = require('./cards');
var HomeNewsView = require('./home-news');
var HomeFeaturedView = require('./home-featured');

var HomeView = Backbone.View.extend({
  el: $('#home'),
  templateSpinner: require('../templates/spinner.html'),

  empty: true,

  events: {
  },

  initialize: function (options) {
    this.render();

    var spinner = this.templateSpinner({});
    this.$('.spinner-content').html(spinner);
    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    //this.$stats = this.$('.stats');
    this.whatsNew = new HomeNewsView({
      el: this.$('.whats-new')
    });
    this.homeFeatured = new HomeFeaturedView({
      el: this.$('.featured')
    });
  },
  render: function () {
    return this;
  },
  request: function () {
    app.client.home(_.bind(this.onHome, this));
  },
  focus: function () {
    if (this.empty) {
      this.request();
    }
    this.$el.show();
    app.trigger('setTitle');
  },
  onHome: function (data) {
    data.fill = true;
    this.$el.removeClass('loading');

    this.cardsView.render(data);
    this.homeFeatured.render(data);
    this.empty = false;
  }
});

module.exports = HomeView;
