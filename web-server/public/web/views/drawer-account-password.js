var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var client = require('../client');
var currentUser = require('../models/current-user');

var DrawerAccountPasswordView = Backbone.View.extend({
  template: require('../templates/drawer-account-password.html'),

  events: {
    'submit .form-password': 'onSubmit',
    'click .cancel-password': 'onCancel',
    'click #password-modal-link': 'onShowForm'
  },

  initialize: function (options) {
    this.user = options.user;

    this.render();

    this.$link = this.$('#password-modal-link');
    this.$form = this.$('.form-password');
    this.$spinner = this.$('.spinner');
    this.$spinner.html(require('../templates/spinner.html'));
    this.$errorLabel = this.$('.error-label');
    this.$success = this.$('.success');
    this.$labelCurrentPassword = this.$('.label-current-password');
    this.$inputCurrentPassword = this.$('.input-current-password');
    this.$inputNewPassword = this.$('.input-new-password');
    this.$inputConfirmPassword = this.$('.input-password-confirm');

    this.$form.hide();
    this.$spinner.hide();
    this.$success.hide();

    if (this.user.account && this.user.account.has_password) {
      this.$link.text(i18next.t('global.change'));
    } else {
      this.$link.text(i18next.t('global.add'));
    }
  },

  render: function () {
    this.$el.html(this.template({user: this.user}));
    return this;
  },

  onShowForm: function (event) {
    event.preventDefault();

    if (this.user.account.has_password !== true) {
      this.$inputCurrentPassword.hide();
      this.$labelCurrentPassword.hide();
    }

    this.$form.show();
    this.$link.hide();
    this.$success.hide();
  },

  onCancel: function (event) {
    event.preventDefault();

    this.$form.hide();
    this.$link.show();
    this.$errorLabel.text('');
    this.$form.removeClass('has-error');
    this.$inputCurrentPassword.val('');
    this.$inputConfirmPassword.val('');
    this.$inputNewPassword.val('');
  },

  onSubmit: function (event) {
    event.preventDefault();

    var that = this;

    if (this.$inputNewPassword.val().length < 6 || this.$inputNewPassword.val().length > 50) {
      this.putError('length');
      return;
    }

    if (this.$inputNewPassword.val() !== this.$inputConfirmPassword.val()) {
      this.putError('confirm');
      return;
    }

    this.$errorLabel.text('');
    this.$spinner.show();
    this.$form.removeClass('has-error');

    client.accountPassword(this.$inputNewPassword.val(), this.$inputCurrentPassword.val(), function (data) {
      that.$spinner.hide();
      if (data.err) {
        return that.putError(data.err);
      }

      that.$inputCurrentPassword.val('');
      that.$inputConfirmPassword.val('');
      that.$inputNewPassword.val('');
      that.$form.hide();
      that.$success.show();
      that.$link.show();
      that.$link.text(i18next.t('global.change'));
      that.$inputCurrentPassword.show();
    });
  },

  putError: function (err) {
    this.$form.addClass('has-error');

    if (err === 'length') {
      this.$errorLabel.text(i18next.t('account.password.error.length'));
    } else if (err === 'confirm') {
      this.$errorLabel.text(i18next.t('account.password.error.confirm'));
    } else if (err === 'wrong-password') {
      this.$errorLabel.text(i18next.t('account.password.error.wrong'));
    } else {
      this.$errorLabel.text(i18next.t('global.unknownerror'));
    }
  }

});


module.exports = DrawerAccountPasswordView;