var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var keyboard = require('../libs/keyboard');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var client = require('../libs/client');

var EventsSpam = Backbone.View.extend({

  events: {
    'click .dropdown-menu .spammed': 'onMarkAsSpam',
    'click .dropdown-menu .unspam': 'onUnmarkAsSpam',
    'click .view-spammed-message': 'onViewSpammedMessage',
    'click .remask-spammed-message': 'onRemaskSpammedMessage',
    'click .dropdown-menu .edited': 'onEditMessage',
    'dblclick .event': 'onEditMessage',
    'keydown .form-message-edit': 'onPrevOrNextFormEdit'
  },

  initialize: function () {
    this.listenTo(this.model, 'messageSpam', this.onMarkedAsSpam);
    this.listenTo(this.model, 'messageUnspam', this.onMarkedAsUnspam);
    this.listenTo(this.model, 'messageEdit', this.onMessageEdited);
    this.listenTo(this.model, 'editMessageClose', this.onEditMessageClose);
    this.listenTo(this.model, 'editPreviousInput', this.pushUpFromInput);
    this.render();
  },
  render: function () {
    this.$scrollable = this.$el;
    this.$scrollableContent = this.$scrollable.find('.scrollable-content');
    this.$realtime = this.$scrollableContent.find('.realtime');

    return this;
  },
  onMarkAsSpam: function (event) {
    event.preventDefault();
    var parent = $(event.currentTarget).closest('.event');
    var roomId = this.model.get('id');
    var messageId = parent.attr('id');

    client.roomMessageSpam(roomId, messageId);
  },
  onUnmarkAsSpam: function (event) {
    event.preventDefault();
    var parent = $(event.currentTarget).closest('.event');
    var roomId = this.model.get('id');
    var messageId = parent.attr('id');
    parent.removeClass('viewed');

    var ctn = parent.find('.text') || parent.find('.image');
    ctn.find('.remask-spammed-message').remove();

    client.roomMessageUnspam(roomId, messageId);
  },
  onMarkedAsSpam: function (room) {
    this.$('#' + room.event)
      .addClass('spammed')
      .find('.ctn')
      .first()
      .append('<div class="text-spammed">' + i18next.t('chat.message.text-spammed') + '</div>');

    app.trigger('scrollDown');
  },
  onMarkedAsUnspam: function (room) {
    this.$('#' + room.event)
      .removeClass('spammed')
      .find('.ctn .text-spammed')
      .remove();

    this.$('#' + room.event).find('.remask-spammed-message').remove();

    app.trigger('scrollDown');
  },
  onViewSpammedMessage: function (event) {
    event.preventDefault();
    var parent = $(event.currentTarget).closest('.event');
    var textSpammed = $(event.currentTarget).closest('.text-spammed');
    var ctn = parent.children('.ctn');
    parent.removeClass('spammed').addClass('viewed');
    textSpammed.remove();

    ctn.prepend('<a class="remask-spammed-message label label-danger">' + i18next.t('chat.message.text-remask') + '</a>');

    app.trigger('scrollDown');
  },
  onRemaskSpammedMessage: function (event) {
    event.preventDefault();
    var parent = $(event.currentTarget).closest('.event');
    var ctn = parent.children('.ctn');
    parent.addClass('spammed').removeClass('viewed');
    parent
      .find('.ctn')
      .first()
      .append('<div class="text-spammed">' + i18next.t('chat.message.text-spammed') + '</div>');

    ctn.find('.remask-spammed-message').remove();

    app.trigger('scrollDown');
  }
});


module.exports = EventsSpam;