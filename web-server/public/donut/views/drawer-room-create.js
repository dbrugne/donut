'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'views/drawer-room-create-mode',
  'common',
  'client',
  'i18next',
  '_templates'
], function ($, _, Backbone, app, DrawerRoomCreateModeView, common, client, i18next, templates) {
  var DrawerRoomCreateView = Backbone.View.extend({
    template: templates['drawer-room-create.html'],

    id: 'room-create',

    events: {
      'keyup .input': 'valid',
      'click .submit': 'submit'
    },

    initialize: function (options) {
      this.render(options.name);
      this.drawerRoomCreateModeView = new DrawerRoomCreateModeView({
        name: options.name,   // default empty
        mode: 'creation',     // default
        el: this.$el.find('.drawer-room-create-mode-ctn')
      });
    },
    render: function (name) {
      var html = this.template({name: name.replace('#', '')});
      this.$el.html(html);
      this.$input = this.$el.find('.input');
      this.$errors = this.$el.find('.errors');
      this.$submit = this.$el.find('.submit');
      return this;
    },
    reset: function () {
      this.$errors.html('').hide();
      this.$el.removeClass('has-error').removeClass('has-success').val('');
    },
    setError: function (error) {
      this.$errors.html(error).show();
    },
    removeView: function () {
      this.drawerRoomCreateModeView.remove();
      this.remove();
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
      this.reset();
      // name
      if (!this._valid()) {
        return this.setError(i18next.t('chat.form.errors.invalid-name'));
      }

      // mode
      if (!this.drawerRoomCreateModeView.isValidMode()) {
        return this.setError(i18next.t('chat.form.errors.invalid-mode'));
      }
      var mode = this.drawerRoomCreateModeView.getMode();

      var name = '#' + this.$input.val();
      var uri = 'room/' + name.replace('#', '');

      this.$submit.addClass('loading');
      client.roomCreate(name, mode, null, _.bind(function (response) {
        this.$submit.removeClass('loading');
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
    }

  });

  return DrawerRoomCreateView;
});
