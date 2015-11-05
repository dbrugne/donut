var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var CardsView = require('./cards');
var SearchView = require('./home-search');
var UsersView = require('./home-users');

var HomeView = Backbone.View.extend({
  el: $('#home'),

  empty: true,

  events: {},

  initialize: function (options) {
    this.render();
    this.searchView = new SearchView({
      el: this.$('.search')
    });
    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    this.usersView = new UsersView({
      el: this.$('.users')
    });

    this.listenTo(this.searchView, 'searchResults', this.onSearchResults);
    this.listenTo(this.searchView, 'emptySearch', this.request);
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
  },
  onSearchResults: function (data) {
    data.search = true;
    this.onHome(data);
  }
});

module.exports = HomeView;
