define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/home-users.html'
], function ($, _, Backbone,  usersTemplate) {
  var UsersView = Backbone.View.extend({

    template: _.template(usersTemplate),

    initialize: function(options) {
    },
    render: function(data) {
      var users = [];
      _.each(data, function(user) {
        user.avatar = $.c.userAvatar(user.avatar, 'user-medium');
        users.push(user);
      });

      var html = this.template({users: users});
      this.$el.html(html);
      return this;
    }
  });

  return UsersView;
});