'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client , currentUser, templates) {
  var DrawerAccountEmailView = Backbone.View.extend({
    template: templates['drawer-account-email.html'],

    events: {
      'click #email-modal-link': 'onShowForm',
      'submit .form-mail': 'onSubmit',
      'click .cancel-email': 'onCancel'
    },

    initialize: function (options) {
      this.user = options.user;

      this.render();

      this.$emailUserCtn = this.$el.find('.email-user-ctn');
      this.$link = this.$('#email-modal-link');
      this.$form = this.$('.form-mail');
      this.$spinner = this.$('.spinner');
      this.$spinner.html(templates['spinner.html']);
      this.$errorLabel = this.$('.error-label');
      this.$success = this.$('.success');
      this.$input = this.$('.email-sub');
      this.$mailUserLabel = this.$('.email-user');

      this.$form.hide();
      this.$spinner.hide();
      this.$success.hide();

      if (this.user.account && this.user.account.email)
        this.$link.text($.t('global.change'));
      else
        this.$link.text($.t('global.add'));
    },

    render: function () {
      this.$el.html(this.template({user: this.user}));
      return this;
    },

    onShowForm: function (event) {
      event.preventDefault();

      this.$form.show();
      this.$emailUserCtn.hide();
      this.$success.hide();
    },

    onCancel: function () {
      event.preventDefault();

      this.$form.hide();
      this.$emailUserCtn.show();
      this.$errorLabel.text('');
      this.$form.removeClass('has-error');
      this.$input.val((this.user.account && this.user.account.email) ? this.user.account.email : '');
    },

    onSubmit: function (event) {
      event.preventDefault();

      var that = this;

      if (this.$input.val().length < 1) {
        this.putError('empty');
        return;
      }

      this.$errorLabel.text('');
      this.$spinner.show();
      this.$form.removeClass('has-error');

      client.accountEmail(this.$input.val(), function (data) {
        that.$spinner.hide();
        if (data.err)
          return that.putError(data.err);

        that.$mailUserLabel.text(that.$input.val());
        that.$form.hide();
        that.$success.show();
        that.$link.text($.t('global.change'));
      });
    },

    putError: function (error) {
      this.$form.addClass('has-error');

      if (error === 'wrong-format')
        this.$errorLabel.text($.t('account.email.error.format'));
      else if (error === 'same-mail')
        this.$errorLabel.text($.t('account.email.error.alreadyyours'));
      else if (error === 'exist')
        this.$errorLabel.text($.t('account.email.error.alreadyexists'));
      else if (error === 'empty')
        this.$errorLabel.text($.t('account.email.error.empty'));
      else
        this.$errorLabel.text($.t('global.unknownerror'));
    }

  });

  return DrawerAccountEmailView;
});
