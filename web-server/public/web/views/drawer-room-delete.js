var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var keyboard = require('../libs/keyboard');
var i18next = require('i18next-client');

var DrawerRoomDeleteView = Backbone.View.extend({
  template: require('../templates/drawer-room-delete.html'),

  id: 'room-delete',

  events: {
    'keyup input[name=input-delete]': 'onKeyup',
    'click .submit': 'onSubmit',
    'click .cancel-lnk': 'onClose'
  },

  initialize: function (options) {
    this.roomId = options.room_id;

    // show spinner as temp content
    this.render();

    app.client.roomRead(this.roomId, null, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  setError: function (err) {
    if (err === 'unknown') {
      err = i18next.t('global.unknownerror');
    }
    this.$errors.html(err).show();
  },
  reset: function () {
    this.$errors.html('').hide();
    this.$el.removeClass('has-error').removeClass('has-success').val('');
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  onResponse: function (room) {
    if (room.group_owner !== app.user.get('user_id') && room.owner_id !== app.user.get('user_id') && !app.user.isAdmin()) {
      return;
    }

    this.roomNameConfirmation = room.name.toLocaleLowerCase();

    var html = this.template({room: room});
    this.$el.html(html);
    this.$input = this.$el.find('input[name=input-delete]');
    this.$errors = this.$el.find('.errors');
    this.groupId = room.group_id;
  },
  onSubmit: function (event) {
    event.preventDefault();
    this.reset();
    if (!this._valid()) {
      return this.setError(i18next.t('chat.form.errors.name-wrong-format'));
    }

    app.client.roomDelete(this.roomId, _.bind(function (response) {
      if (response.err) {
        return this.setError(i18next.t('chat.form.errors.' + response.err, {defaultValue: i18next.t('global.unknownerror')}));
      }

      app.trigger('alert', 'info', i18next.t('chat.form.room-form.edit.room.delete.success'));
      this.trigger('close');
    }, this));
  },
  onKeyup: function (event) {
    this._cleanupState();

    if (this._valid()) {
      this.$el.addClass('has-success');
    } else {
      this.$el.removeClass('has-success');
    }

    // Enter in field handling
    var key = keyboard.getLastKeyCode(event);
    if (event.type === 'keyup' && key.key === keyboard.RETURN) {
      return this.onSubmit(event);
    }
  },
  onClose: function (event) {
    event.preventDefault();
    this.trigger('close');
  },
  _valid: function () {
    var name = this.$input.val();
    var pattern = new RegExp('^' + this.roomNameConfirmation + '$', 'i');
    return pattern.test(name);
  },
  _cleanupState: function () {
    this.$el.removeClass(function (index, css) {
      return (css.match(/(has-(success|error))+/g) || []).join(' ');
    });
  }
});

module.exports = DrawerRoomDeleteView;
