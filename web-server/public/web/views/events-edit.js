var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var keyboard = require('../libs/keyboard');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var client = require('../client');
var currentUser = require('../models/current-user');
var MessageEditView = require('./message-edit');

var EventsEdit = Backbone.View.extend({

  events: {
    'shown.bs.dropdown .actions': 'onMessageMenuShow',
    'click .dropdown-menu .edited': 'onEditMessage',
    'dblclick .event': 'onEditMessage',
    'keydown .form-message-edit': 'onPrevOrNextFormEdit'
  },

  initialize: function () {
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
  onMessageMenuShow: function (event) {
    var ownerUserId = '';
    var $event = $(event.currentTarget).closest('.event');
    if (this.model.get('owner')) {
      ownerUserId = this.model.get('owner').get('user_id');
    }
    var userId = $event.closest('[data-user-id]').data('userId');
    var isMessageOwner = (ownerUserId === userId);

    var isEditable = this.isEditableMessage($event);

    if (this.model.get('type') === 'room') {
      var isOp = this.model.currentUserIsOp();
      var isOwner = this.model.currentUserIsOwner();
      var isAdmin = this.model.currentUserIsAdmin();
    }

    if (((!isOwner && !isAdmin && !isOp) || (isOp && isMessageOwner)) && (!isEditable)) {
      $(event.currentTarget).find('.dropdown-menu').dropdown('toggle');
      return;
    }
    var html = require('../templates/events-dropdown.html')({
      data: {
        isOp: isOp,
        isOwner: isOwner,
        isAdmin: isAdmin,
        isMessageOwner: isMessageOwner,
        isEditable: isEditable
      }
    });
    $(event.currentTarget).find('.dropdown-menu').html(html);
  },
  onEditMessage: function (event) {
    event.preventDefault();

    var $event = $(event.currentTarget).closest('.event');

    if (!this.isEditableMessage($event)) {
      return;
    }
    this.editMessage($event);
  },
  isEditableMessage: function ($event) {
    var special = $event.data('special');
    if (special && special !== 'me') {
      return false;
    }
    var userId = $event.closest('[data-user-id]').data('userId');
    if (currentUser.get('user_id') !== userId) {
      return false;
    }
    var time = $event.data('time');
    if (((Date.now() - new Date(time)) > window.message_maxedittime)) {
      return false;
    }

    return !$event.hasClass('spammed');
  },
  onPrevOrNextFormEdit: function (event) {
    var direction;
    var key = keyboard._getLastKeyCode(event);
    if (key.key === keyboard.UP) {
      direction = 'prev';
    } else if (key.key === keyboard.DOWN) {
      direction = 'next';
    } else {
      return app.trigger('scrollDown');
    }

    var $currentEventMessage = $(event.currentTarget).closest('.event');
    var $currentBlockMessage = $(event.currentTarget).closest('.message');

    var userId = $currentBlockMessage.data('userId');

    // get sibling .event
    var $candidate = $currentEventMessage[direction]();
    var $candidateBlock = $currentBlockMessage[direction]();

    // no sibling .event, try with sibling .block
    if (!$candidate.length && $candidateBlock.length) {
      var _lastBlock = $candidateBlock;
      while ((_lastBlock.data('userId') !== userId)) {
        if (!_lastBlock[direction]().length) {
          return;
        }
        _lastBlock = _lastBlock[direction]();
      }

      $candidate = (direction === 'prev')
        ? _lastBlock.find('.event').last()
        : _lastBlock.find('.event').first();
    }

    if (this.isEditableMessage($candidate)) {
      this.editMessage($candidate);
    }

    app.trigger('scrollDown');
  },
  pushUpFromInput: function () {
    var _lastBlock = this.$realtime.find('.block.message').last();
    while (_lastBlock.data('userId') !== currentUser.get('user_id')) {
      if (!_lastBlock.prev().length) {
        return;
      }
      _lastBlock = _lastBlock.prev();
    }
    var $event = _lastBlock.find('.event').last();
    if (this.isEditableMessage($event)) {
      this.editMessage($event);
    }

    app.trigger('scrollDown');
  },
  editMessage: function ($event) {
    if (this.messageUnderEdition) {
      this.onEditMessageClose();
    }
    this.messageUnderEdition = new MessageEditView({
      el: $event,
      model: this.model
    });

    app.trigger('scrollDown');
  },
  onMessageEdited: function (data) {
    var $event = this.$('#' + data.event);

    if ($event.find('.text').html() === undefined) {
      $('<div class="text"></div>').insertAfter(this.$('#' + data.event).find('.message-edit'));
    }
    var msg = common.markup.toHtml(data.message, {
      template: require('../templates/markup.html'),
      style: 'color: ' + this.model.get('color')
    });
    msg = $.smilify(msg);
    data.message = msg;

    data.message += '<span class="text-edited">&nbsp;(' + i18next.t('chat.message.edition.edited') + ')</span>';
    $event.find('.ctn').find('.text').html(data.message);

    app.trigger('scrollDown');
  },
  _remove: function () {
    if (this.messageUnderEdition) {
      this.messageUnderEdition.remove();
    }
    this.remove();
  },
  onEditMessageClose: function () {
    if (!this.messageUnderEdition) {
      return;
    }
    this.messageUnderEdition.remove();
    this.messageUnderEdition = null;
  },
  getMessageUnderEdition: function () {
    return this.messageUnderEdition;
  }
});


module.exports = EventsEdit;