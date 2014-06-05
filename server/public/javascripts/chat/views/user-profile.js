define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/modal',
  'text!templates/user-profile.html'
], function ($, _, Backbone, client, ModalView, profileTemplate) {
  var UserProfileView = ModalView.extend({

    template: _.template(profileTemplate),

    events: {
      'click .discuss': 'hide' // hide modal when user click on onetoone button
    },

    _initialize: function() {
      this.listenTo(client, 'user:profile', this.onProfile)
    },
    onProfile: function(data) {
      this.render(data.user).show();
    },
    render: function(user) {
      var html = this.template({user: user});
      var $body = this.$el.find('.modal-body').first();
      $body.html(html);
      $body.find('.website').linkify();
      return this;
    }

  });

  return UserProfileView;
});