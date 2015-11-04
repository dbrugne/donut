var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');

var SearchView = Backbone.View.extend({
  timeout: 0,
  timeBufferBeforeSearch: 500,
  lastSearch: '',
  limit: 100,
  events: {
    'keyup input[type=text]': 'onKeyup',
    'click i.icon-search': 'onKeyup',
    'change .checkbox-search': 'onKeyup'
  },

  initialize: function (options) {
    this.$search = this.$('input[type=text]').first();
    this.$searchOptionsUsers = this.$('#search-options-users');
    this.$searchOptionsRooms = this.$('#search-options-rooms');
    this.$searchOptionsGroups = this.$('#search-options-groups');
  },
  render: function (data) {
    return this;
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
      return this.trigger('emptySearch');
    }

    this.lastSearch = s;
    var options = {
      users: opt.users,
      rooms: opt.rooms,
      groups: opt.groups,
      limit: this.limit,
      skip: skip
    };
    client.search(s, options, _.bind(function (data) {
      if (skip !== null) {
        data.append = true;
      }
      this.trigger('searchResults', data);
    }, this));
  }
});

module.exports = SearchView;
