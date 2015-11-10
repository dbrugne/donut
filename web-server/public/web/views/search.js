var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var CardsView = require('./cards');

var SearchPageView = Backbone.View.extend({
  el: $('#search'),
  template: require('../templates/search.html'),

  timeout: 0,
  timeBufferBeforeSearch: 500,
  lastSearch: '',
  limit: 100,

  events: {
    'click .load-more': 'onLoadMore',
    'click .search-options li': 'onKeyup'
  },

  initialize: function () {
    this.$search = $('#navbar').find('.search').find('input[type=text]').first();
  },

  render: function (data) {
    this.$el.html(this.template({data: data}));
    this.$options = this.$el.find('.search-options');
    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    this.$searchMore = this.$('.load-more');

    app.trigger('setTitle');
    app.trigger('changeColor');

    if (data && data.search && data.what) {
      return this.search(data.search, data.skip, data.what);
    }

    data.search = this.$search.val();
    this.search(data.search, null, data.what);
  },
  onHome: function (data) {
    data.fill = true;
    this.cardsView.render(data);
    this.$el.show();
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
    this.search(this.$search.val(), count, {
      users: this.$options.find('li[data-type="users"]').hasClass('active'),
      rooms: this.$options.find('li[data-type="rooms"]').hasClass('active'),
      groups: this.$options.find('li[data-type="groups"]').hasClass('active')
    });
  },
  onKeyup: function (event) {
    event.preventDefault();
    this.cardsView.pending();

    var what = $(event.currentTarget).data('type');
    if (!what) {
      return;
    }

    this.$options.find('li').removeClass('active');
    $(event.currentTarget).addClass('active');

    clearTimeout(this.timeout);
    this.timeout = setTimeout(_.bind(function () {
      this.search(this.$search.val(), null, {
        users: what === 'users',
        rooms: what === 'rooms',
        groups: what === 'groups'
      });
    }, this), this.timeBufferBeforeSearch);
  },
  search: function (s, skip, opt) {
    skip = skip || null;
    opt = opt
      || {
        users: this.$options.find('li[data-type="users"]').hasClass('active'),
        rooms: this.$options.find('li[data-type="rooms"]').hasClass('active'),
        groups: this.$options.find('li[data-type="groups"]').hasClass('active')
      };

    if (!s || s.length < 1) {
      return;
    }

    this.lastSearch = s;
    var options = {
      users: opt.users,
      rooms: opt.rooms || (!opt.users && !opt.rooms && !opt.groups), // default search on rooms when all are null
      groups: opt.groups,
      limit: {
        users: this.limit,
        rooms: this.limit,
        groups: this.limit
      },
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
