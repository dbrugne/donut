var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var CardsView = require('./cards');
var SearchView = require('./home-search');
var UsersView = require('./home-users');
var common = require('@dbrugne/donut-common/browser');

var HomeView = Backbone.View.extend({
  el: $('#home'),

  empty: true,
  resultsTemplate: require('../templates/dropdown-search.html'),

  events: {
    'blur input[type=text]': 'closeResults'
  },

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
    this.$dropdownResults = this.$('.search .results');
    this.$search = this.$('.search');

    this.listenTo(this.searchView, 'searchResults', this.onSearchResults);
    this.listenTo(this.searchView, 'emptySearch', this.onEmptyResults);
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
    _.each(_.union(
      data.rooms
        ? data.rooms.list
        : [],
      data.groups
        ? data.groups.list
        : [],
      data.users
        ? data.users.list
        : []
    ), function (card) {
      card.avatar = common.cloudinary.prepare(card.avatar, 90);
    });
    this.$dropdownResults.html(this.resultsTemplate({search: this.searchView.getValue(), results: data}));
    this.$dropdownResults.fadeIn();
  },
  onEmptyResults: function () {
    this.$dropdownResults.html(this.resultsTemplate());
    this.$dropdownResults.fadeIn();
  },
  closeResults: function () {
    this.$search.removeClass('open');
    this.$dropdownResults.fadeOut();
  }
});

module.exports = HomeView;
