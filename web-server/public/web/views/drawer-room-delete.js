var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var i18next = require('i18next-client');
var app = require('../models/app');
var client = require('../client');
var currentUser = require('../models/current-user');

var DrawerRoomDeleteView = Backbone.View.extend({
  template: require('../templates/drawer-room-delete.html'),

  id: 'room-delete',

  events: {
    'keyup .input': 'onKeyup',
    'click .submit': 'onSubmit'
  },

  initialize: function (options) {
    this.roomId = options.room_id;

    // show spinner as temp content
    this.render();

    // ask for data
    var that = this;
    client.roomRead(this.roomId, null, function (data) {
      if (!data.err) {
        that.onResponse(data);
      }
    });

    // on room:delete callback
    this.listenTo(client, 'room:delete', this.onDelete);
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  onResponse: function (room) {
    if (room.owner.user_id !== currentUser.get('user_id') && !currentUser.isAdmin()) {
      return;
    }

    this.roomNameConfirmation = room.name.toLocaleLowerCase();

    var html = this.template({room: room});
    this.$el.html(html);
    this.$input = this.$('.input');
  },
  onSubmit: function (event) {
    event.preventDefault();
    if (!this._valid()) {
      return;
    }

    client.roomDelete(this.roomId);
  },
  onDelete: function (data) {
    if (!data.name || data.name.toLocaleLowerCase() !== this.roomNameConfirmation) {
      return;
    }

    this.$('.errors').hide();

    if (!data.success) {
      var message = '';
      _.each(data.errors, function (error) {
        message += error + '<br>';
      });
      this.$('.errors').html(message).show();
      return;
    }

    app.trigger('alert', 'info', i18next.t('edit.room.delete.success'));
    this.trigger('close');
  },
  onKeyup: function (event) {
    this._cleanupState();

    if (this._valid()) {
      this.$el.addClass('has-success');
    } else {
      this.$el.removeClass('has-success');
    }

    // Enter in field handling
    var key = keyboard._getLastKeyCode(event);
    if (event.type === 'keyup' && key.key === keyboard.RETURN) {
      return this.onSubmit(event);
    }
  },
  _valid: function () {
    var name = '#' + this.$input.val();
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