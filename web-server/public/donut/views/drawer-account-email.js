define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client ,currentUser, templates) {
  var DrawerAccountEmailView = Backbone.View.extend({

    template: templates['drawer-account-email.html'],

    events: {
      'click #email-modal-link' : 'onShowForm',
      'submit .form-mail'       : 'onSubmit',
      'click .cancel-email'     : 'onCancel'
    },

    initialize: function(options) {
      this.user = options.user;

      this.render();

      this.$link = this.$('#email-modal-link');
      this.$form = this.$('.form-mail');
      this.$spinner = this.$('.spinner');
      this.$spinner.html(templates['spinner.html']);
      this.$error = this.$('.error');
      this.$errorLabel = this.$('.error-label');
      this.$success = this.$('.success');
      this.$input = this.$('.email-sub');
      this.$mailUserLabel = this.$('.email-user');

      this.$form.hide();
      this.$spinner.hide();
      this.$success.hide();
    },

    render: function() {
      this.$el.html(this.template({user: this.user}));
      return this;
    },

    onShowForm: function(event) {
      event.preventDefault();

      this.$form.show();
      this.$link.hide();
      this.$error.show();
    },

    onCancel: function() {
      event.preventDefault();

      this.$form.hide();
      this.$link.show();
      this.$error.hide();
    },

    onSubmit: function(event) {
      event.preventDefault();

      var that = this;

      if (this.$input.val().length < 1) {
        this.putError('empty');
        return;
      }

      this.$errorLabel.text('');
      this.$spinner.show();
      this.$form.removeClass('has-error');

      client.accountEmail(this.$('.email-sub').val(), function (data) {
        that.$spinner.hide();
        if (data.err) {
          that.putError(data.err);
        } else {
          that.$mailUserLabel.text(that.$input.val());
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