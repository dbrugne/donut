'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'client'
], function ($, _, Backbone, client) {
  var SearchView = Backbone.View.extend({
    lastSearch: '',

    events: {
      'keyup input[type=text]': 'onKeyup',
      'click i.icon-search': 'onKeyup'
    },

    initialize: function (options) {
      this.$search = this.$el.find('input[type=text]').first();
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
      if (!s || s.length < 1)
        return client.home();

      this.lastSearch = s;
      client.search(s, true, true, 100, false, _.bind(function (data) {
        this.trigger('searchResults', data);
      }, this));
    }

  });

  return SearchView;
});
