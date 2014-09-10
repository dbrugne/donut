define([
  'jquery',
  'underscore',
  'backbone',
  'models/client'
], function ($, _, Backbone, client) {
  var SearchView = Backbone.View.extend({

    lastSearch: '',

    events: {
      'keyup input[type=text]': 'onKeyup'
    },

    initialize: function(options) {
      this.$search = this.$el.find('input[type=text]').first();
    },
    render: function(data) {
      return this;
    },
    onKeyup: function(event) {
      event.preventDefault();

      if(event.which == 13) {
        this.search();
      }

      this.search();
    },
    search: function() {
      var s = this.$search.val();
      if (!s || s.length < 1)
        return;

      if (s == this.lastSearch)
        return; // avoid keyup noise

      this.lastSearch = s;
      client.search(s);
    },

  });

  return SearchView;
});
