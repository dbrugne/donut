var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');

var SearchView = Backbone.View.extend({
  timeout: 0,
  timeBufferBeforeSearch: 500,
  limit: 100,
  events: {
    'keyup input[type=text]': 'onKeyup',
    'change .checkbox-search': 'onKeyup'
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
  search: function () {
    var s = this.$search.val();
    if (!s || s.length < 1) {
      return this.trigger('emptySearch');
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
      this.trigger('searchResults', data);
    }, this));
  }
});

module.exports = SearchView;
