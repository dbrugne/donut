define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client ,currentUser, templates) {
  var DrawerAccountPasswordView = Backbone.View.extend({

    template: templates['drawer-account-password.html'],

    events: {
      'submit .form-password'       : 'onSubmit',
      'click .cancel-password'      : 'onCancel',
      'click #password-modal-link'  : 'onShowForm'
    },

    initialize: function(options) {
      this.user = options.user;

      this.render();

      this.$link = this.$('#password-modal-link');
      this.$form = this.$('.form-password');
      this.$spinner = this.$('.spinner');
      this.$spinner.html(templates['spinner.html']);
      this.$error = this.$('.error');
      this.$errorLabel = this.$('.error-label');
      this.$success = this.$('.success');
      this.$inputNewPassword = this.$('.input-new-password');
      this.$inputCurrentPassword = this.$('.input-current-password');

      if (!this.user.account.email) {
        this.$inputCurrentPassword.hide();
        this.$link.hide();
      } else {
        this.$form.hide();
        this.$spinner.hide();
        this.$success.hide();
      }
    },

    render: function() {
      this.$el.html(this.template());
      return this;
    },

    onShowForm: function (event) {
      event.preventDefault();

      this.$form.show();
      this.$link.hide();
      this.$error.show();
    },

    onCancel: function (event) {
      event.preventDefault();

      if (this.user.account.email) {
        this.$form.hide();
        this.$link.show();
      }
        this.$error.hide();
    },

    onSubmit: function(event) {
      event.preventDefault();

      var that = this;

      if (this.$inputNewPassword.val() !== this.$inputNewPassword.val()) {
       this.putError('confirm');
       return;
      }

      if (this.$inputNewPassword.val().length < 6 || this.$inputNewPassword.val().length > 50) {
        this.putError('length');
        return;
      }

      this.$errorLabel.text('');
      this.$spinner.show();
      this.$form.removeClass('has-error');

      client.accountPassword(this.$inputNewPassword.val(), this.$inputCurrentPassword.val(), function (data) {
        that.$spinner.hide();
        if (data.err) {
          that.putError(data.err);
        } else {
          that.$form.hide();
          that.$success.show();
          that.$errorLabel.text('');
          that.$error.hide();
        }
      });
    },

    putError: function (error) {
      this.$form.addClass('has-error');
      this.$error.show();

      if (error === 'length')
        this.$errorLabel.text($.t('account.password.error.length'));
      else if (error === 'confirm')
        this.$errorLabel.text($.t('account.password.error.confirm'));
      else if (error === 'wrong-Password')
        this.$errorLabel.text($.t('account.password.error.wrong'));
      else
        this.$errorLabel.text($.t('global.unknownerror'));
    }

  });

  return DrawerAccountPasswordView;
});
