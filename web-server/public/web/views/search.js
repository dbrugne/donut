var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var CardsView = require('./cards');

var SearchPageView = Backbone.View.extend({
  el: $('#search'),
  template: require('../templates/search.html'),

  timeout: 0,
  timeBufferBeforeSearch: 500,
  lastSearch: '',
  limit: 25,

  initialize: function () {
    this.$search = $('#navbar').find('.search').find('input[type=text]').first();
  },

  render: function (data) {
    // display search query and set a tab as active if any choosen
    this.$el.html(this.template({data: data})).show();
    var val = this.$search.val();
    var limit = this.limit;

    this.searchRoomsView = new CardsView({
      el: this.$('.cards-view').find('.rooms'),
      type: 'rooms',
      loadData: function (skip, fn) {
        app.client.search({
          search: val,
          type: 'rooms',
          limit: limit,
          skip: skip,
          full: true
        }, fn);
      }
    });

    this.searchUsersView = new CardsView({
      el: this.$('.cards-view').find('.users'),
      type: 'users',
      loadData: function (skip, fn) {
        app.client.search({
          search: val,
          type: 'users',
          limit: limit,
          skip: skip,
          full: true
        }, fn);
      }
    });

    this.searchGroupsView = new CardsView({
      el: this.$('.cards-view').find('.groups'),
      type: 'groups',
      loadData: function (skip, fn) {
        app.client.search({
          search: val,
          type: 'groups',
          limit: limit,
          skip: skip,
          full: true
        }, fn);
      }
    });

    app.trigger('setTitle');

    // nothing selected, or rooms selected, load it !
    if ((!data.what || data.what.rooms || (!data.what.users && !data.what.groups)) && !this.searchRoomsView.loaded) {
      this.searchRoomsView.load();
    } else if (data.what.users && !this.searchUsersView.loaded) {
      this.searchUsersView.load();
    } else {
      this.searchGroupsView.load();
    }

    // detect click on tab to load group user at least one when needed (rooms are loaded by default just above)
    this.$('a[data-toggle="tab"]').on('show.bs.tab', _.bind(function (e) {
      if ($(e.target).data('type') === 'users' && !this.searchUsersView.loaded) {
        this.searchUsersView.load();
      }
      if ($(e.target).data('type') === 'groups' && !this.searchGroupsView.loaded) {
        this.searchGroupsView.load();
      }
      if ($(e.target).data('type') === 'rooms' && !this.searchRoomsView.loaded) {
        this.searchRoomsView.load();
      }
    }, this));
  }
});

module.exports = SearchPageView;
