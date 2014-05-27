define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'text!templates/user-profile.html'
], function ($, _, Backbone, client, profileTemplate) {
  var UserProfileView = Backbone.View.extend({

    el: $('#user-profile-modal'),

    template: _.template(profileTemplate),

    events: {
      'hidden.bs.modal': 'teardown',
      'click .discuss': 'hide' // hide modal when user click on onetoone button
    },

    initialize: function() {
      this.listenTo(client, 'user:profile', this.onProfile)
    },

    onProfile: function(data) {
      this.render(data.user).show();
    },

    render: function(user) {
      var html = this.template({user: user});
      this.$el.find('.modal-body').first().html(html);
      return this;
    },

    show: function() {
      this.$el.modal('show');
    },

    hide: function() {
      this.$el.modal('hide');
    },

    teardown: function() {
      this.$el.data('modal', null);
    }

  });

  return new UserProfileView();
});