'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'common',
  'client',
  'i18next',
  '_templates'
], function ($, _, Backbone, app, common, client, i18next, _templates) {
  var DrawerRoomCreateView = Backbone.View.extend({
    template: _templates['drawer-room-create.html'],

    id: 'room-create',

    events: {
      'keyup .input': 'valid',
      'click .submit': 'submit',
      'change input[name="mode"]': 'onChangeMode',
      'click .random-password': 'onRandomPassword'
    },

    initialize: function (options) {
      this.render(options.name);
    },
    render: function (name) {
      var html = this.template({name: name.replace('#', '')});
      this.$el.html(html);
      this.$input = this.$el.find('.input');
      this.$errors = this.$('.errors');
      this.$password = this.$('.input-password');
      this.$password.val(this.randomPassword());
      return this;
    },
    reset: function () {
      this.$errors.html('').hide();
      this.$el.removeClass('has-error').removeClass('has-success').val('');
    },
    setError: function (error) {
      this.$errors.html(error).show();
    },
    valid: function (event) {
      if (this.$input.val() === '') {
        this.$el.removeClass('has-error').removeClass('has-success');
        return;
      }

      var valid = this._valid();
      if (!valid) {
        this.$el.addClass('has-error').removeClass('has-success');
      } else {
        this.$el.addClass('has-success').removeClass('has-error');
      }

      // Enter in field handling
      if (valid && event.type === 'keyup' && event.which === 13) {
        this.submit();
      }
    },
    _valid: function () {
      var name = '#' + this.$input.val();
      return common.validateName(name);
    },
    submit: function () {
      // name
      if (!this._valid()) {
        return this.setError(i18next.t('chat.form.errors.invalid-name'));
      }
      var name = '#' + this.$input.val();
      var uri = 'room/' + name.replace('#', '');

      // mode
      var checked = this.$('[name="mode"]:checked');
      if (!checked.length) {
        this.setError(i18next.t('chat.form.errors.invalid-mode'));
        return;
      }
      var mode = checked.attr('value');

      var password;
      if (mode === 'password') {
        password = this.$password.val();
        if (!password) {
          this.setError(i18next.t('chat.form.errors.invalid-password'));
          return;
        }
      }

      client.roomCreate(name, mode, password, _.bind(function (response) {
        if (response.code === 400) {
          var error = i18next.t('chat.form.errors.' +
            response.err, {name: name, uri: uri});
          return this.setError(error);
        } else if (response.code === 500) {
          return this.setError(i18next.t('global.unknownerror'));
        }

        window.router.navigate(uri, {trigger: true});
        app.trigger('alert', 'info', i18next.t('chat.successfullycreated', {name: name}));
        this.reset();
        this.trigger('close');
      }, this));
    },

    onChangeMode: function (event) {
      var $target = $(event.currentTarget).first();
      if ($target.attr('type') === 'radio' && $target.attr('name') === 'mode') {
        if ($target.attr('value') !== 'password') {
          this.$('.field-password').css('display', 'none');
        } else {
          this.$('.field-password').css('display', 'block');
          this.$password.focus();
        }
      }
    },

    onRandomPassword: function (event) {
      event.preventDefault();
      this.$password.val(this.randomPassword());
      this.$password.focus();
    },

    randomPassword: function () {
      var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      var password = '';
      for (var i = 0; i < 6; i++) {
        var index = Math.floor(Math.random() * chars.length);
        password += chars[index];
      }
      return password;
    }

  });

  return DrawerRoomCreateView;
});
