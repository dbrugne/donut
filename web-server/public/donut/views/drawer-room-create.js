'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'libs/keyboard',
  'models/app',
  'common',
  'client',
  'i18next',
  '_templates'
], function ($, _, Backbone, keyboard, app, common, client, i18next, templates) {
  var DrawerRoomCreateView = Backbone.View.extend({
    template: templates['drawer-room-create.html'],

    id: 'room-create',

    events: {
      'keyup .input': 'valid',
      'click .submit': 'submit'
    },

    initialize: function (options) {
      this.render(options.name);
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
      this.$el.removeClass(function (index, css) {
        return (css.match(/(has-(success|error))+/g) || []).join(' ');
      });

      if (this.$input.val() === '') {
        return;
      }

      var valid = this._valid();
      if (!valid) {
        this.$el.addClass('has-error');
      } else {
        this.$el.addClass('has-success');
      }

      // Enter in field handling
      var key = keyboard._getLastKeyCode(event);
      if (valid && event.type === 'keyup' && key.key === keyboard.RETURN) {
        this.submit();
      }
    },
    _valid: function () {
      var name = '#' + this.$input.val();
      var mode = this._getMode();
      return common.validateName(name) && common.validateMode(mode);
    },
    _getMode: function () {
      return this.$el.find('input[name="mode"]:checked').val();
    },
    isValidMode: function () {
      return (common.validateMode(this._getMode()));
    },
    submit: function () {
      this.reset();
      // name
      if (!this._valid()) {
        return this.setError(i18next.t('chat.form.errors.invalid-name'));
      }

      // mode
      if (!this.isValidMode()) {
        return this.setError(i18next.t('chat.form.errors.invalid-mode'));
      }
      var mode = this._getMode();

      var name = '#' + this.$input.val();

      this.$submit.addClass('loading');
      client.roomCreate(name, mode, null, _.bind(function (response) {
        this.$submit.removeClass('loading');
        if (response.code === 400) {
          var uri = 'room/' + name.replace('#', '');
          var error = i18next.t('chat.form.errors.' +
            response.err, {name: name, uri: uri});
          return this.setError(error);
        } else if (response.code === 500) {
          return this.setError(i18next.t('global.unknownerror'));
        }

        app.trigger('focusRoom', name);
        this.reset();
        this.trigger('close');
      }, this));
    }

  });

  return DrawerRoomCreateView;
});
