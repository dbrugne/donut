define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client ,currentUser, templates) {
  var DrawerAccountPasswordView = Backbone.View.extend({

    template: templates['drawer-user-account-password.html'],

    events: {
      'submit .form-password'       : 'onSubmit',
      'click #password-modal-link'  : 'onShowForm'
    },

    initialize: function(options) {
    },

    render: function() {
      this.$('.password-form-container').html(this.template());

      this.$('.spinner').html(templates['spinner.html']);
      this.$('.spinner').hide();
      this.$('.error').hide();
      this.$('.success').hide();
      return this;
    },

    onShowForm: function (event) {
      event.preventDefault();

      this.$('#password-modal-link').hide();
      this.render();
    },

    onSubmit: function(event) {
      event.preventDefault();

      var that = this;

      if (this.$('.input-password').val() === this.$('.input-password-confirm').val() && this.$('.input-password').val().length >= 6 && this.$('.input-password').val().length <= 50) {
        this.$('.error').hide();
        this.$('.spinner').show();
        this.$('.form-password').removeClass('has-error');

        client.accountPassword(this.$('.input-password').val(), function (data) {
          that.$('.spinner').hide();
          if (data.err) {
            that.$('.form-mail').addClass('has-error');
            that.$('.error').show();

            if (data.err === 'length')
              that.$('.error-label').text($.t('account.password.error.length'));
            else
              that.$('.error-label').text($.t('global.unknownerror'));

          } else {
            that.$('input').hide();
            that.$('.success').show();
          }
        });

      }
      else if (this.$('.input-password').val().length >= 6 && this.$('.input-password').val().length <= 50) {
        this.$('.form-password').addClass('has-error');
        this.$('.error').show();
        this.$('.error-label').text($.t('account.password.error.confirm'));
      } else {
        this.$('.form-password').addClass('has-error');
        this.$('.error').show();
        this.$('.error-label').text($.t('account.password.error.length'));
      }
    }

  });

  return DrawerAccountPasswordView;
});
