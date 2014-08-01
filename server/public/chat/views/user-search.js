define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'text!templates/user-search-results.html'
], function ($, _, Backbone, client, resultsTemplate) {
  var UserSearchView = Backbone.View.extend({

    el: $('#user-search-modal'),

    template: _.template(resultsTemplate),

    events: {
      'click .user-search-submit': 'search',
      'keyup .user-search-input': 'search'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      this.listenTo(client, 'user:searchsuccess', this.onSuccess);
      this.listenTo(client, 'user:searcherror', this.onError);
    },

    show: function() {
      this.$el.modal('show');
    },

    hide: function() {
      this.$el.modal('hide');
    },

    render: function(users) {
      var html = this.template({
        users: users
      });
      this.$el.find('.users-list').first().html(html);

      return this;
    },

    search: function() {
      var search = this.$el.find('.user-search-input').first().val();
      client.userSearch(search);
    },

    onSuccess: function(data) {
      this.render(data.users);
    },

    onError: function() {
      this.hide();
      this.mainView.alert('error', "Something didn't work. Please retry in few minutes.");
    }

  });

  return UserSearchView;
});