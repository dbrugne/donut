define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/main',
  'text!templates/user-search-results.html',
  'bootstrap'
], function ($, _, Backbone, client, mainView, resultsTemplate) {
  var UserSearchView = Backbone.View.extend({

    el: $('#user-search-modal'),

    template: _.template(resultsTemplate),

    events: {
      'click .user-search-submit': 'search',
      'keyup .user-search-input': 'search',
      'click .users-list li': 'openSelected'
    },

    initialize: function() {
      this.listenTo(client, 'user:searchSuccess', this.searchSuccess);
      this.listenTo(client, 'user:searchError', this.searchError);
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
      client.searchForUsers(search);
    },

    searchSuccess: function(results) {
      this.render(results.users);
    },

    searchError: function() {
      // @todo : implement error-callback in DOM
      console.error('Error on searchForUsers call');
    },

    openSelected: function(event) {
      var user_id = $(event.currentTarget).data('userId');
      mainView.userProfileModal(user_id);
      this.hide();
    }

  });

  return new UserSearchView();
});