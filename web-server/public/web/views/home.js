var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var CardsView = require('./cards');
var UsersView = require('./home-users');

var HomeView = Backbone.View.extend({
  el: $('#home'),

  empty: true,

  events: {
    'click .load-more': 'onLoadMore'
  },

  initialize: function (options) {
    this.render();

    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    this.usersView = new UsersView({
      el: this.$('.users')
    });
    this.$searchMore = this.$('.left .load-more');
  },
  render: function () {
    return this;
  },
  request: function () {
    client.home(_.bind(this.onHome, this));
  },
  focus: function () {
    if (this.empty) {
      this.request();
    }
    this.$el.show();
    app.trigger('setTitle');
    app.trigger('changeColor');
  },
  onHome: function (data) {
    data.fill = true;
    this.cardsView.render(_.omit(data, 'users'));
    this.usersView.render(_.omit(data, ['rooms', 'groups']));
    this.empty = false;
  }
});

module.exports = HomeView;
