var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var CardsView = require('./cards');
var UsersView = require('./home-users');

var HomeView = Backbone.View.extend({
  el: $('#home'),

  empty: true,

  events: {
  },

  initialize: function (options) {
    this.render();
    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    this.usersView = new UsersView({
      el: this.$('.users')
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
    app.trigger('changeColor');
  },
  onHome: function (data) {
    data.fill = true;
    this.$el.removeClass('loading');
    this.cardsView.render(_.omit(data, 'users'));
    this.usersView.render(_.omit(data, ['rooms', 'groups']));
    this.empty = false;
  }
});

module.exports = HomeView;
