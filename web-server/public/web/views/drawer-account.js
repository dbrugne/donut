var $ = require('jquery');
var Backbone = require('backbone');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
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
    client.userRead(currentUser.get('user_id'), function (data) {
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
    this.emailView.remove();
    this.passwordView.remove();
    this.manageEmailsView.remove();
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
    this.manageEmailsView = new ManageEmailsView({
      el: this.$('.manage-email-container'),
      user: this.user
    });

    $('[data-toggle="contactform"]').contactform({});
  }

});

module.exports = DrawerUserEditView;
