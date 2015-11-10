var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');

var SearchView = Backbone.View.extend({
  timeout: 0,
  timeBufferBeforeSearch: 500,
  limit: 100,
  resultsTemplate: require('../templates/dropdown-search.html'),
  events: {
    'keyup input[type=text]': 'onKeyup',
    'change .checkbox-search': 'onKeyup',
    'blur #navbar .search input[type=text]': 'closeResults'
  },

  initialize: function (options) {
    this.$search = this.$('input[type=text]').first();
    this.$dropdownResults = this.$('.results');
    this.listenTo(app, 'goToSearch', this.closeResults);
  },
  render: function (data) {
    return this;
  },
  onKeyup: function (event) {
    event.preventDefault();

    clearTimeout(this.timeout);
    this.timeout = setTimeout(_.bind(function () {
      this.search();
    }, this), this.timeBufferBeforeSearch);
  },
  search: function () {
    this.$dropdownResults.html(require('../templates/spinner.html'));
    this.$el.addClass('open');
    var s = this.$search.val();
    if (!s || s.length < 1) {
      return this.onEmptyResults();
    }

    var options = {
      users: true,
      rooms: true,
      groups: true,
      limit: {
        users: 4,
        groups: 4,
        rooms: 4
      }
    };
    client.search(s, options, _.bind(function (data) {
      if (data.groups.list.length + data.users.list.length + data.rooms.list.length === 0) {
        return this.onEmptyResults();
      }
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
      this.$dropdownResults.html(this.resultsTemplate({search: this.getValue(), results: data}));
      this.$dropdownResults.fadeIn();
    }, this));
  },
  onEmptyResults: function () {
    this.$dropdownResults.html(this.resultsTemplate());
    this.$dropdownResults.fadeIn();
  },
  closeResults: function () {
    this.$el.removeClass('open');
    this.$dropdownResults.fadeOut();
  },
  getValue: function () {
    return this.$search.val();
  }
});

module.exports = SearchView;
