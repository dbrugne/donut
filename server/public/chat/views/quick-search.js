define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var QuickSearchView = Backbone.View.extend({

    lastSearch: '',

    events: {
      'keyup input[type=text]': 'onKeyup',
      'click i.fa-search': 'search'
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.$search = this.$el.find('input[type=text]').first();
    },
    render: function(data) {
      return this;
    },
    onKeyup: function(event) {
      event.preventDefault();

      if(event.which != 13) {
        return;
      }

      this.search();
    },
    search: function() {
      var s = this.$search.val();

      this.mainView.focusHome();
      this.mainView.homeView.searchView.$search
        .val(s)
        .focus();

      this.mainView.homeView.searchView.search();
    }

  });

  return QuickSearchView;
});
