var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');

var SearchView = Backbone.View.extend({
  lastSearch: '',

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
    this.search();
  },
  search: function () {
    var s = this.$search.val();
    if (!s || s.length < 1) {
      return this.trigger('emptySearch');
    }

    this.lastSearch = s;
    client.search(s, true, true, false, 100, 0, false, _.bind(function (data) {
      this.trigger('searchResults', data);
    }, this));
  }

});

module.exports = SearchView;
