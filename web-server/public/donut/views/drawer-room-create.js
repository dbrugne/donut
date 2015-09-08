'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'client',
  '_templates'
], function ($, _, Backbone, app, client, _templates) {
  var DrawerRoomCreateView = Backbone.View.extend({
    template: _templates['drawer-room-create.html'],

    id: 'room-create',

    events: {
      'keyup .input': 'valid',
      'click .submit': 'submit',
      'change .savable': 'onChangeValue',
      'click .random-password': 'onClickRandomPassword'
    },

    initialize: function (options) {
      this.render(options.name);
      this.$input = this.$el.find('.input');
      this.$joinChecked = this.$el.find('.join.everyone');
      this.$historyChecked = this.$el.find('.history.everyone');
    },
    /**
     * Only set this.$el content
     */
    render: function (name) {
      var html = this.template({name: name.replace('#', '')});
      this.$el.html(html);
      return this;
    },
    reset: function () {
      this.$el.removeClass('has-error').removeClass('has-success').val('');
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
      var pattern = /^#[-a-z0-9\._|[\]^]{3,24}$/i;
      if (pattern.test(name)) {
        return true;
      } else {
        return false;
      }
    },
    submit: function () {
      if (!this._valid()) {
        return false;
      }

      var name = '#' + this.$input.val();
      var uri = 'room/' + name.replace('#', '');
      if (this.$joinChecked.attr('value') === 'password') {
        var joinPassword = this.$el.find('.input-password').val();
      }
      var options = {
        join_mode: this.$joinChecked.attr('value'),
        join_mode_password: joinPassword,
        history_mode: this.$historyChecked.attr('value')
      };

      var that = this;
      client.roomCreate(name, options, function (response) {
        if (response.err === 'alreadyexists') {
          app.trigger('alert', 'error', $.t('chat.alreadyexists', {name: name, uri: uri}));
          that.reset();
          that.trigger('close');
          return;
        } else if (response.err) {
          return that.createError(response);
        }

        window.router.navigate(uri, {trigger: true});
        app.trigger('alert', 'info', $.t('chat.successfullycreated', {name: name}));
        that.reset();
        that.trigger('close');
      });
    },
    onChangeValue: function (event) {
      var $target = $(event.currentTarget);
      var type = $target.attr('type');
      var name = $target.attr('name').substr($target.attr('name').lastIndexOf(':') + 1);

      if (type === 'radio' && name === 'join') {
        this.$joinChecked = $target;
        if (this.$joinChecked.attr('value') === 'password') {
          this.$el.find('.field-password').css('display', 'block');
          this.$el.find('.input-password').val(this.generateRandomPassword());
          this.$el.find('.input-password').focus();
        } else {
          this.$el.find('.field-password').css('display', 'none');
        }
      }
      if (type === 'radio' && name === 'history') {
        this.$historyChecked = $target;
      }
    },

    onClickRandomPassword: function (event) {
      event.preventDefault();
      if (this.$joinChecked.attr('value') === 'password') {
        this.$el.find('.input-password').val(this.generateRandomPassword());
        this.$el.find('.input-password').focus();
      }
    },

    generateRandomPassword: function () {
      var limit = (Math.random() * 12) + 8;
      var password = '';
      var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (var i = 0; i < limit; i++) {
        var index = Math.floor(Math.random() * chars.length);
        password += chars[index];
      }
      return password;
    },

    createError: function (dataErrors) {
      var message = '';
      _.each(dataErrors.err, function (error) {
        message += $.t('chat.room-form.errors.' + error) + '<br>';
      });
      this.$el.find('.errors').html(message).show();
    }

  });

  return DrawerRoomCreateView;
});
