var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');

var MessageEditView = Backbone.View.extend({
  template: require('../templates/message-edit.html'),

  events: {
    'click .message-form .enter': 'onSubmit',
    'click .message-form .esc': 'onEscape',
    'keydown .form-message-edit': 'onKeydown'
  },

  initialize: function (options) {
    this.$text = this.$('.text');
    this.$textEdited = this.$('.text-edited');
    this.$messageEdit = this.$('.message-edit');

    var method = (this.model.get('type') === 'room')
      ? 'getRoomEvent'
      : 'getUserEvent';

    var messageId = this.$el.attr('id');
    if (!messageId) {
      return this.model.trigger('editMessageClose');
    }

    app.client[method](this.model.get('id'), messageId, _.bind(function (response) {
      if (response.err) {
        return this.model.trigger('editMessageClose');
      }
      if (response.type !== 'room:message' && response.type !== 'user:message') {
        return this.model.trigger('editMessageClose');
      }
      if (!response.data || !response.data.message) {
        return this.model.trigger('editMessageClose');
      }

      this.render(response.data.message);
    }, this));
  },
  render: function (message) {
    if (this.$el.data('edited') || this.$textEdited) {
      this.$textEdited.remove();
    }

    this.$messageEdit.html(this.template);
    this.$text.addClass('hidden');
    this.$el.removeClass('has-hover');

    this.originalMessage = common.markup.toText(message).trim();

    this.$messageForm = this.$('.message-form');
    this.$messageForm
      .css('display', 'block')
      .find('.form-message-edit')
      .val(this.originalMessage)
      .focus();

    this.$formMessageEdit = this.$('.form-message-edit');
    this.$el.find('.date.pull-right').hide();

    this.updateFormSize();

    // bind click outside listener
    var that = this;
    this.onClickOutsideHandler = function (event) {
      if ($(event.target).hasClass('form-message-edit') || $(event.target).hasClass('edited')) {
        return;
      }

      that.model.trigger('editMessageClose');
    };
    _.defer(_.bind(function () {
      $('html').one('click', this.onClickOutsideHandler);
    }, this));

    return this;
  },
  remove: function () {
    this.$el.removeClass('editing');
    this.model.trigger('inputFocus'); // refocus discussion input field
    $('html').off('click', this.onClickOutsideHandler);
    if (this.$el.data('edited') || this.$textEdited) {
      this.$text.append(this.$textEdited);
    }
    this.$text.removeClass('hidden');
    if (this.$messageForm) {
      this.$messageForm.remove();
    }
    this.$el.addClass('has-hover');
    this.$el.find('.date.pull-right').show();
    this.undelegateEvents();
    this.stopListening();
  },

  onSubmit: function (event) {
    event.preventDefault();
    var messageId = this.$el.attr('id');
    var message = this.$formMessageEdit.val();

    if (this.originalMessage === message) {
      this.model.trigger('editMessageClose');
      return;
    }

    if (this.model.get('type') === 'room') {
      app.client.roomMessageEdit(this.model.get('id'), messageId, message);
    } else {
      app.client.userMessageEdit(this.model.get('id'), messageId, message);
    }

    this.model.trigger('editMessageClose');
  },
  onEscape: function (event) {
    event.preventDefault();
    this.model.trigger('editMessageClose');
  },
  onKeydown: function (event) {
    this.updateFormSize();
    var data = keyboard.getLastKeyCode(event);
    if (data.key === keyboard.ESC) {
      this.onEscape(event);
    } else if (data.key === keyboard.RETURN && !data.isShift) {
      this.onSubmit(event);
    }
  },
  updateFormSize: function () {
    if (!this.$formMessageEdit) {
      return;
    }
    this.$formMessageEdit.css('height', '1px');
    this.$formMessageEdit
      .css('height',
        (2 + this.$formMessageEdit.prop('scrollHeight')) + 'px');
  }
});
module.exports = MessageEditView;
