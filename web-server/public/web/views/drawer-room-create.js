var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var urls = require('../../../../shared/util/url');
var currentUser = require('../libs/app').user;

var DrawerRoomCreateView = Backbone.View.extend({
  template: require('../templates/drawer-room-create.html'),

  id: 'room-create',

  events: {
    'keyup input[name=input-create]': 'valid',
    'click .submit': 'submit'
  },

  initialize: function (options) {
    this.group_id = options.group_id;
    this.group_name = options.group_name;
    this.render(options.name);
  },
  render: function (name) {
    var html = this.template({name: name, group_id: this.group_id, group_name: this.group_name, confirmed: currentUser.isConfirmed()});
    this.$el.html(html);
    this.$input = this.$el.find('input[name=input-create]');
    this.$errorLabel = this.$('.error-label');
    this.$error = this.$('.error');
    this.$submit = this.$el.find('.submit');
    this.$error.hide();
    return this;
  },
  focusField: function () {
    this.$input.focus();
  },
  reset: function () {
    this.$error.hide();
    this.$errorLabel.html('');
    this.$el.removeClass('has-error').removeClass('has-success').val('');
  },
  setError: function (err) {
    if (err === 'unknown') {
      err = i18next.t('global.unknownerror');
    }
    this.$error.show();
    this.$errorLabel.html(err);
  },
  removeView: function () {
    this.drawerRoomCreateModeView.remove();
    this.remove();
  },
  valid: function (event) {
    this._cleanupState();

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
    var key = keyboard.getLastKeyCode(event);
    if (valid && event.type === 'keyup' && key.key === keyboard.RETURN) {
      this.submit();
    }
  },
  _valid: function () {
    var name = this.$input.val();
    var mode = this._getMode();
    return common.validate.name(name) && common.validate.mode(mode);
  },
  _getMode: function () {
    return this.$el.find('input[name="mode"]:checked').val();
  },
  isValidMode: function () {
    return (common.validate.mode(this._getMode()));
  },
  submit: function () {
    this.reset();
    // name
    if (!this._valid()) {
      return this.setError(i18next.t('chat.form.errors.name-wrong-format'));
    }

    // mode
    if (!this.isValidMode()) {
      return this.setError(i18next.t('chat.form.errors.mode-wrong-format'));
    }
    var mode = this._getMode();

    var name = this.$input.val();

    this.$submit.addClass('loading');
    app.client.roomCreate(name, mode, null, this.group_id, _.bind(function (response) {
      this.$submit.removeClass('loading');
      if (response.code !== 500 && response.success !== true) {
        var uri;
        if (response.err === 'group-name-already-exist') {
          uri = urls({name: name}, 'group', 'uri');
        } else if (response.err === 'not-confirmed') {
          return this.setError(i18next.t('chat.form.errors.' + response.err));
        } else {
          uri = urls({group_name: this.group_name, name: name}, 'room', 'uri');
        }
        var error = i18next.t('chat.form.errors.' + response.err, {name: name, uri: uri, defaultValue: i18next.t('global.unknownerror')});
        return this.setError(error);
      } else if (response.code === 500) {
        return this.setError(i18next.t('global.unknownerror'));
      }

      if (this.group_name) {
        app.trigger('joinRoom', '#' + this.group_name + '/' + name);
      } else {
        app.trigger('joinRoom', '#' + name);
      }
      this.reset();
      this.trigger('close');
    }, this));
  },
  _cleanupState: function () {
    this.$el.removeClass(function (index, css) {
      return (css.match(/(has-(success|error))+/g) || []).join(' ');
    });
  }
});
module.exports = DrawerRoomCreateView;
