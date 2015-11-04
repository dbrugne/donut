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
    'click i.icon-search': 'onKeyup'
  },

  initialize: function (options) {
    this.$search = this.$('input[type=text]').first();
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
  search: function (skip) {
    skip = skip || null;
    var s = this.$search.val();
    if (!s || s.length < 1) {
      return this.trigger('emptySearch');
    }

    this.lastSearch = s;
    var options = {
      users: true,
      rooms: true,
      groups: true,
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
