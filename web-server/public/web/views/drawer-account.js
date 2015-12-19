var $ = require('jquery');
var Backbone = require('backbone');
var app = require('../libs/app');
var currentUser = require('../libs/app').user;
var EmailView = require('./drawer-account-email');
var PasswordView = require('./drawer-account-password');
var ManageEmailsView = require('./drawer-account-manage-emails');

var DrawerUserEditView = Backbone.View.extend({
  template: require('../templates/drawer-account.html'),

  id: 'user-account',

  events: {},

  initialize: function (options) {
    // show spinner as temp content
    this.render();

    // ask for data
    var that = this;
    app.client.userRead(currentUser.get('user_id'), {admin: true}, function (data) {
      if (data.err) {
        return;
      }

      that.user = data;
      that.onResponse(data);
    });
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  _remove: function () {
    if (this.emailView) {
      this.emailView.remove();
    }
    if (this.passwordView) {
      this.passwordView.remove();
    }
    if (this.manageEmailsView) {
      this.manageEmailsView.remove();
    }
    this.remove();
  },
  onResponse: function (user) {
    if (!user || !user.account) {
      return this.trigger('close');
    }
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
    this.manageEmailsView = new ManageEmailsView({
      el: this.$('.manage-email-container'),
      user: this.user
    });

    $('[data-toggle="contactform"]').contactform({});
  }

});

module.exports = DrawerUserEditView;
