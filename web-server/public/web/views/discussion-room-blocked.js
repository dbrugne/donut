var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var moment = require('moment');
var common = require('@dbrugne/donut-common/browser');
var app = require('../models/app');
var client = require('../libs/client');

var RoomBlockedView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion',

  hasBeenFocused: false,

  template: require('../templates/discussion-room-blocked.html'),

  events: {
    'click .ask-for-allowance': 'onRequestAllowance',
    'click .valid-password': 'onValidPassword',
    'click .close-room': 'onCloseRoom',
    'click .rejoin': 'onRejoin'
  },

  initialize: function () {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.render();
  },
  render: function () {
    var data = this.model.toJSON();

    // owner
    var owner = this.model.get('owner').toJSON();
    data.owner = owner;

    // banned_at
    if (data.banned_at) {
      data.banned_at = moment(data.banned_at).format('dddd Do MMMM YYYY');
    } else if (data.blocked === 'banned') {
      data.banned_at = 'unable to retrieve';
    }

    // avatar
    data.avatar = common.cloudinary.prepare(data.avatar, 100);

    // id
    data.room_id = this.model.get('id');

    // dropdown
    data.dropdown = require('../templates/dropdown-room-actions.html')({
      data: data
    });

    // render
    var html = this.template(data);
    this.$el.html(html);
    this.$el.hide();

    this.initializeTooltips();

    return this;
  },
  removeView: function () {
    this.remove();
  },
  changeColor: function () {
    if (this.model.get('focused')) {
      app.trigger('changeColor', this.model.get('color'));
    }
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.$el.show();
      this.hasBeenFocused = true;
    } else {
      this.$el.hide();
    }
  },
  onRequestAllowance: function () {
    client.roomJoinRequest(this.model.get('id'), function (response) {
      if (response.err) {
        if (response.err === 'banned' || response.err === 'notallowed') {
          app.trigger('alert', 'error', i18next.t('chat.allowed.error.' + response.err));
        } else {
          app.trigger('alert', 'error', i18next.t('global.unknownerror'));
        }
      } else {
        app.trigger('alert', 'info', i18next.t('chat.allowed.success'));
      }
    });
  },
  onValidPassword: function (event) {
    var password = $(event.currentTarget).closest('.password-form').find('.input-password').val();
    client.roomJoin(this.model.get('id'), this.model.get('name'), password, function (response) {
      if (response.err && (response.err === 'wrong-password' || response.err === 'spam-password')) {
        $(event.currentTarget).closest('.password-form').find('.error').html(i18next.t('chat.password.' + response.err));
      } else if (response.err) {
        $(event.currentTarget).closest('.password-form').find('.error').html(i18next.t('chat.password.error'));
      }
    });
  },
  onRejoin: function (event) {
    client.roomJoin(this.model.get('id'), null, null, function (response) {
      if (response.err) {
        app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
    });
  },

  onCloseRoom: function (event) {
    event.preventDefault();
    client.roomLeaveBlock(this.model.get('id'));
  },
  initializeTooltips: function () {
    this.$('[data-toggle="tooltip"]').tooltip();
  }

});


module.exports = RoomBlockedView;