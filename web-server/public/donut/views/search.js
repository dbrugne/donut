define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  '_templates'
], function ($, _, Backbone, client, templates) {
  var SearchView = Backbone.View.extend({

    el: $('#search'),

    template: templates['search.html'],

    lastSearch: '',

    events: {
      'keyup input[type=text]': 'onKeyup',
      'click button[type=submit]': 'onSubmit',
      'click .close-results': 'onClose'
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.$search = this.$el.find('input[type=text]').first();
      this.$dropdown = this.$el.find('.dropdown-menu').first();
      this.$results = this.$el.find('#search-results');
    },
    render: function(data) {
      this.$results.html(this.template(data));
      return this;
    },
    onKeyup: function(event) {
      event.preventDefault();

      if(event.which != 13)
        return;

      this.onSearch();
    },
    onClose: function(event) {
      // @todo : .close and .open-user/room-profile doesn't works
      event.preventDefault();
      this.$dropdown.dropdown('toggle');
    },
    onSubmit: function(event) {
      event.preventDefault();
      this.onSearch();
    },
    onSearch: function() {
      var s = this.$search.val();
      if (!s || s === '')
        return console.log('@todo : close dropdown');

      if (s === this.lastSearch)
        return;

      var that = this;
      client.search(s, true, true, 5, true, function(data) {
        that.lastSearch = s;
        if (data.rooms)
          _.each(data.rooms.list, function(element, index, list) {
            element.avatarUrl = $.cd.roomAvatar(element.avatar, 20);
            data.rooms.list[index] = element;
          });

        if (data.users)
          _.each(data.users.list, function(element, index, list) {
            element.avatarUrl = $.cd.userAvatar(element.avatar, 20);
            data.users.list[index] = element;
          });

        that.render(data);
        that.$dropdown.dropdown('toggle');
      });
    },
    focus: function() {
      this.$search.focus();
    }

  });

  return SearchView;
});
