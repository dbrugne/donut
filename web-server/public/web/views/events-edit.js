var $ = require('jquery');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var app = require('../libs/app');
var emojione = require('emojione');
var MessageEditView = require('./message-edit');

module.exports = Backbone.View.extend({
  events: {
    'click .actions .action.edit': 'onEdit',
    'dblclick .block.message .text': 'onEdit',
    'keydown .form-message-edit': 'editNext'
  },

  initialize: function () {
    this.listenTo(this.model, 'messageEdit', this.onEdited);
    this.listenTo(this.model, 'editMessageClose', this.onClose);
    this.listenTo(this.model, 'editPreviousInput', this.editNext);
    this.render();
  },
  render: function () {
    this.$realtime = this.$('.realtime');
    return this;
  },
  onEdit: function (event) {
    event.preventDefault();

    var $event = $(event.currentTarget).closest('.block.message');

    if (!this.isEditable($event)) {
      return;
    }

    $event.addClass('editing');
    this.editMessage($event);
  },
  isEditable: function ($event) {
    var special = $event.data('special');
    if (special && special !== 'me') {
      return false;
    }
    var userId = $event.data('userId');
    if (app.user.get('user_id') !== userId) {
      return false;
    }
    var time = $event.data('time');
    if (((Date.now() - new Date(time)) > window.message_maxedittime)) {
      return false;
    }

    return !$event.hasClass('spammed');
  },
  editNext: function (event) {
    var key = keyboard.getLastKeyCode(event);
    if (key.key !== keyboard.UP && key.key !== keyboard.DOWN) {
      return this.model.trigger('scrollDown');
    }

    var $listMessages = this.$realtime.find('.block.message[data-user-id="' + app.user.get('user_id') + '"]');
    if (!$listMessages.length) {
      return;
    }

    var $candidate;
    if (!this.messageUnderEdition) {
      $candidate = $listMessages.last();
    } else {
      var that = this;
      if (key.key === keyboard.DOWN) {
        $listMessages = $($listMessages.get().reverse());
      }
      $listMessages.each(function () {
        if (that.messageUnderEdition.$el.attr('id') === $(this).attr('id')) {
          return false;
        }
        $candidate = $(this);
      });
    }

    if (!$candidate) {
      return;
    }

    if (this.isEditable($candidate)) {
      this.editMessage($candidate);
    }

    this.model.trigger('scrollDown');
  },
  editMessage: function ($event) {
    if (this.messageUnderEdition) {
      if ($event.attr('id') === this.messageUnderEdition.$el.attr('id')) {
        return;
      }
      this.onClose();
    }
    this.messageUnderEdition = new MessageEditView({
      el: $event,
      model: this.model
    });

    this.model.trigger('scrollDown');
  },
  onEdited: function (data) {
    var $event = this.$('#' + data.event);

    if ($event.find('.text').html() === undefined) {
      $('<div class="text"></div>').insertAfter(this.$('#' + data.event).find('.message-edit'));
    }
    var msg = common.markup.toHtml(data.message, {
      template: require('../templates/markup.html')
    });

    msg = emojione.shortnameToImage(msg);
    data.message = msg;

    data.message += '<span class="text-edited">&nbsp;(' + i18next.t('chat.message.edition.edited') + ')</span>';
    $event.find('.ctn').find('.text').html(data.message);

    this.model.trigger('scrollDown');
  },
  _remove: function () {
    if (this.messageUnderEdition) {
      this.messageUnderEdition.remove();
    }
    this.remove();
  },
  onClose: function () {
    if (!this.messageUnderEdition) {
      return;
    }
    this.messageUnderEdition.remove();
    this.messageUnderEdition = null;
  },
  getEditionHeight: function () {
    if (!this.messageUnderEdition) {
      return;
    }

    return this.messageUnderEdition.$el.height();
  }
});
