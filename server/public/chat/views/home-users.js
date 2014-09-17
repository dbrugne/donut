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
      _.each(data.users, function(user) {
        user.avatar = $.cd.userAvatar(user.avatar, 30, user.color);
        users.push(user);
      });

      var html = this.template({users: users, search: data.search});
      this.$el.html(html);
      return this;
    }
  });

  return UsersView;
});