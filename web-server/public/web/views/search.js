var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var CardsView = require('./cards');

var SearchPageView = Backbone.View.extend({
  el: $('#search'),
  timeout: 0,
  timeBufferBeforeSearch: 500,
  lastSearch: '',
  limit: 100,
  empty: true,

  events: {
    'click .load-more': 'onLoadMore',
    'keyup input[type=text]': 'onKeyup',
    'click i.icon-search': 'onKeyup',
    'change .checkbox-search': 'onKeyup'
  },

  initialize: function (options) {
    this.render();

    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    this.$search = this.$('input[type=text]').first();
    this.$searchMore = this.$('.load-more');
    this.$searchOptionsUsers = this.$('#search-options-users');
    this.$searchOptionsRooms = this.$('#search-options-rooms');
    this.$searchOptionsGroups = this.$('#search-options-groups');
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
    this.cardsView.render(data);
    this.empty = false;
  },
  onSearchResults: function (data) {
    data.search = true;
    this.onHome(data);
    this.toggleMore(data);
  },
  toggleMore: function (data) {
    var count = this.cardsView.count();
    var more =
      (data.rooms
        ? data.rooms.count > count.rooms
        : false) ||
      (data.groups
        ? data.groups.count > count.groups
        : false);

    if (more) {
      this.$searchMore.removeClass('hidden');
    } else {
      this.$searchMore.addClass('hidden');
    }
  },
  onLoadMore: function () {
    this.cardsView.cleanupEmpty();
    var count = this.cardsView.count();
    this.search(count, {
      users: this.$searchOptionsUsers.is(':checked'),
      rooms: this.$searchOptionsRooms.is(':checked'),
      groups: this.$searchOptionsGroups.is(':checked')
    });
  },
  onKeyup: function (event) {
    event.preventDefault();

    clearTimeout(this.timeout);
    this.timeout = setTimeout(_.bind(function () {
      this.search(null, {
        users: this.$searchOptionsUsers.is(':checked'),
        rooms: this.$searchOptionsRooms.is(':checked'),
        groups: this.$searchOptionsGroups.is(':checked')
      });
    }, this), this.timeBufferBeforeSearch);
  },
  search: function (skip, opt) {
    skip = skip || null;
    opt = opt || {
      users: true,
      rooms: true,
      groups: true
    };
    var s = this.$search.val();
    if (!s || s.length < 1) {
      return this.request();
    }

    this.lastSearch = s;
    var options = {
      users: opt.users,
      rooms: opt.rooms,
      groups: opt.groups,
      limit: this.limit,
      skip: skip,
      mix: true
    };
    client.search(s, options, _.bind(function (data) {
      if (skip !== null) {
        data.append = true;
      }
      this.onSearchResults(data);
    }, this));
  }
});

module.exports = SearchPageView;
