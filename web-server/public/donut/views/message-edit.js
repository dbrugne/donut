define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, donutDebug, client, currentUser, templates) {

  var debug = donutDebug('donut:message-edit');

  var MessageEditView = Backbone.View.extend({

    template: templates['message-edit.html'],

    events: {
      'click .message-form .enter' : 'onSubmit',
      'click .message-form .esc'   : 'onEscape',
      'keydown .form-message-edit' : 'onKeydown'
    },

    initialize: function (options) {
      this.render();
    },
    render: function () {
      this.$text = this.$el.find('.text');
      this.$textEdited = this.$el.find('.text-edited');
      this.$messageEdit = this.$el.find('.message-edit');

      if (this.$el.data('edited'))
        this.$textEdited.remove();

      this.$messageEdit.html(this.template);
      this.$text.addClass('hidden');
      this.$el.removeClass('has-hover');

      this.originalMessage = this.htmlSmileyToText(this.$text.html());

      this.$messageForm = this.$el.find('.message-form');
      this.$messageForm
        .css('display', 'block')
        .find('.form-message-edit')
        .val(this.originalMessage)
        .focus();

      this.$formMessageEdit = this.$el.find('.form-message-edit');

      this.updateFormSize();

      // bind click outside listener
      var that = this;
      this.onClickOutsideHandler = function (event) {
        if ($(event.target).hasClass('form-message-edit') || $(event.target).hasClass('edited'))
          return;

        that.model.trigger('editMessageClose');
      };
      $('html').one('click', this.onClickOutsideHandler);

      return this;
    },
    remove: function () {
      this.model.trigger('inputFocus'); // refocus discussion input field
      $('html').off('click', this.onClickOutsideHandler);
      if (this.$el.data('edited'))
        this.$text.append(this.$textEdited);
      this.$text.removeClass('hidden');
      this.$messageForm.remove();
      this.$el.addClass('has-hover');
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

      if (this.model.get('type') == 'room') {
        client.roomMessageEdit(this.model.get('name'), messageId, message);
      } else {
        client.userMessageEdit(this.model.get('username'), messageId, message);
      }

      this.model.trigger('editMessageClose');
    },
    onEscape: function (event) {
      event.preventDefault();
      this.model.trigger('editMessageClose');
    },
    onKeydown: function (event) {
      this.updateFormSize();
      var data = this._getKeyCode();
      if (event.which == 27) // escape
        this.onEscape(event);
      else if (event.which == 13 && !data.isShift) // enter
        this.onSubmit(event);
    },
    updateFormSize: function () {
      if (!this.$formMessageEdit)
        return;
      this.$formMessageEdit.css('height', '1px');
      this.$formMessageEdit
        .css('height',
          (2 + this.$formMessageEdit.prop('scrollHeight')) + 'px');
    },
    htmlSmileyToText: function(html) {
      var $html = $('<div>'+html+'</div>');
       _.each($html.find('.smilify'), function(e) {
        $(e).replaceWith($.smilifyGetSymbolFromCode($(e).data('smilify-code')));
      });
      return $html.text();
    },
    _getKeyCode: function() {
      if (window.event) {
        return {
          key: window.event.keyCode,
          isShift: !!window.event.shiftKey
        };
      } else {
        return {
          key: event.which,
          isShift: !!event.shiftKey
        };
      }
    },
  });

  return MessageEditView;
});