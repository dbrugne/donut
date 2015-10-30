var $ = require('jquery');
var Backbone = require('backbone');
var app = require('../models/app');
var i18next = require('i18next-client');
var client = require('../libs/client');

module.exports = Backbone.View.extend({

  events: {
    'click .dropdown-menu .spammed': 'onMarkAsSpam',
    'click .dropdown-menu .unspam': 'onUnmarkAsSpam',
    'click .view-spammed-message': 'onViewSpammedMessage',
    'click .remask-spammed-message': 'onRemaskSpammedMessage'
  },

  initialize: function () {
    this.listenTo(this.model, 'messageSpam', this.onMarkedAsSpam);
    this.listenTo(this.model, 'messageUnspam', this.onMarkedAsUnspam);
    this.render();
  },
  render: function () {
    return this;
  },
  onMarkAsSpam: function (event) {
    event.preventDefault();
    var parent = $(event.currentTarget).closest('.block.message');
    var roomId = this.model.get('id');
    var messageId = parent.attr('id');

    client.roomMessageSpam(roomId, messageId);
  },
  onUnmarkAsSpam: function (event) {
    event.preventDefault();
    var parent = $(event.currentTarget).closest('.block.message');
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
  },
  onMarkedAsUnspam: function (room) {
    this.$('#' + room.event)
      .removeClass('spammed')
      .find('.ctn .text-spammed')
      .remove();

    this.$('#' + room.event).find('.remask-spammed-message').remove();
  },
  onViewSpammedMessage: function (event) {
    event.preventDefault();
    var parent = $(event.currentTarget).closest('.block.message');
    var textSpammed = $(event.currentTarget).closest('.text-spammed');
    var ctn = parent.children('.ctn');
    parent.removeClass('spammed').addClass('viewed');
    textSpammed.remove();

    ctn.prepend('<a class="remask-spammed-message label label-danger">' + i18next.t('chat.message.text-remask') + '</a>');
  },
  onRemaskSpammedMessage: function (event) {
    event.preventDefault();
    var parent = $(event.currentTarget).closest('.block.message');
    var ctn = parent.children('.ctn');
    parent.addClass('spammed').removeClass('viewed');
    parent
      .find('.ctn')
      .first()
      .append('<div class="text-spammed">' + i18next.t('chat.message.text-spammed') + '</div>');

    ctn.find('.remask-spammed-message').remove();
  }
});
