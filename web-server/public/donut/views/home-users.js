define([
  'jquery',
  'underscore',
  'backbone',
  '_templates'
], function ($, _, Backbone,  templates) {
  var UsersView = Backbone.View.extend({

    template: templates['home-users.html'],

    initialize: function(options) {
    },
    render: function(data) {
      var users = [];
      _.each(data.users, function(user) {
        user.avatar = $.cd.userAvatar(user.avatar, 30);
        users.push(user);
      });

      var html = this.template({users: users, search: data.search});
      this.$el.html(html);
      return this;
    }
  });

  return UsersView;
});