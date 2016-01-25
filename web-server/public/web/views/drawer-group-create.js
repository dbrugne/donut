var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var urls = require('../../../../shared/util/url');

var DrawerGroupCreateView = Backbone.View.extend({
  template: require('../templates/drawer-group-create.html'),

  id: 'group-create',

  events: {
    'keyup input[name=input-create]': 'valid',
    'click .submit': 'submit'
  },

  initialize: function (options) {
    this.render();
  },
  render: function (name) {
    this.$el.html(this.template);
    this.$input = this.$el.find('input[name=input-create]');
    this.$errors = this.$el.find('.errors');
    this.$submit = this.$el.find('.submit');
    return this;
  },
  focusField: function () {
    this.$input.focus();
  },
  reset: function () {
    this.$errors.html('').hide();
    this.$el.removeClass('has-error').removeClass('has-success').val('');
  },
  setError: function (err) {
    if (err === 'unknown') {
      err = i18next.t('global.unknownerror');
    }
    this.$errors.html(err).show();
  },
  removeView: function () {
    this.drawerGroupCreateModeView.remove();
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
    var key = keyboard._getLastKeyCode(event);
    if (valid && event.type === 'keyup' && key.key === keyboard.RETURN) {
      this.submit();
    }
  },
  _valid: function () {
    var name = this.$input.val();
    return common.validate.group(name);
  },
  submit: function () {
    this.reset();
    // name
    if (!this._valid()) {
      return this.setError(i18next.t('chat.form.errors.name-wrong-format'));
    }
    var name = this.$input.val();

    this.$submit.addClass('loading');
    app.client.groupCreate(name, _.bind(function (response) {
      this.$submit.removeClass('loading');
      if (!response.success) {
        if (response.err === 'group-name-already-exist') {
          var uri = urls({name: name}, 'group', 'uri');
          return this.setError(i18next.t('chat.form.errors.' + response.err, {name: name, uri: uri, defaultValue: i18next.t('global.unknownerror')}));
        }
        if (response.err === 'not-confirmed') {
          return this.setError(i18next.t('chat.form.errors.' + response.err));
        }
        return this.setError(i18next.t('global.unknownerror'));
      }
      // @todo : group creation confirmation popin
      app.trigger('joinGroup', '#' + name);
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
module.exports = DrawerGroupCreateView;
