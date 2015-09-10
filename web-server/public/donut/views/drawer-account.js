'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/drawer-account-email',
  'views/drawer-account-password',
  '_templates'
], function ($, _, Backbone, client, currentUser, EmailView, PasswordView, templates) {
  var DrawerUserEditView = Backbone.View.extend({
    template: templates['drawer-account.html'],

    id: 'user-account',

    events: {},

    initialize: function (options) {
      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.userRead(currentUser.get('user_id'), null, function (err, data) {
        if (err) {
          return;
        }

        that.user = data;
        that.onResponse(data);
      });
    },
    render: function () {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    _remove: function () {
      this.emailView.remove();
      this.passwordView.remove();
      this.remove();
    },
    onResponse: function (user) {
      if (user.color) {
        this.trigger('color', user.color);
      }

      var html = this.template({user: user});
      this.$el.html(html);

      this.emailView = new EmailView({
        el: this.$('.email-container'),
        user: this.user
      });
      this.passwordView = new PasswordView({
        el: this.$('.password-container'),
        user: this.user
      });
    }

  });

  return DrawerUserEditView;
});
