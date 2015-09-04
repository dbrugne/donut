'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'common',
  'libs/donut-debug',
  'libs/keyboard',
  'models/current-user',
  'views/input-rollup',
  'views/input-commands',
  'views/input-typing',
  'views/input-images',
  'views/input-smileys',
  '_templates'
], function ($, _, Backbone, i18next, common, donutDebug, keyboard, currentUser, RollupView, CommandsView, TypingView, ImagesView, SmileysView, templates) {
  var debug = donutDebug('donut:input');

  var DiscussionInputView = Backbone.View.extend({
    template: templates['input.html'],

    events: {
      'keyup .editable': 'onKeyUp',
      'keydown .editable': 'onKeyDown',
      'click .send': 'onSubmitMessage',
      'click .editable': 'onInputClicked'
    },

    initialize: function (options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'inputFocus', this.onFocus);
      this.listenTo(this.model, 'inputActive', this.onInputActiveChange);

      this.render();

      this.commandsView = new CommandsView({
        model: this.model
      });
      this.rollupView = new RollupView({
        el: this.$el,
        model: this.model,
        commands: this.commandsView.getCommands(this.model.get('type'))
      });
      this.typingView = new TypingView({
        el: this.$('.typing-container'),
        model: this.model
      });
      this.imagesView = new ImagesView({
        el: this.$el,
        model: this.model
      });
      this.smileysView = new SmileysView({
        el: this.$el,
        model: this.model
      });
    },

    _remove: function () {
      this.commandsView.remove();
      this.rollupView.remove();
      this.typingView.remove();
      this.imagesView.remove();
      this.smileysView.remove();
      this.remove();
    },

    render: function () {
      this.$el.html(this.template({
        avatar: common.cloudinarySize(currentUser.get('avatar'), 80),
        bannedMessage: i18next.t('chat.actions.bannedMessage.__type__'.replace('__type__', this.model.get('type')))
      }));

      this.$editable = this.$('.editable');
      this.$preview = this.$('.preview');
      this.$rollup = this.$('.rollup-container');

      if (!this.model.isInputActive())
        this.$el.addClass('inactive');
      else
        this.$el.removeClass('inactive');
    },

    onInputActiveChange: function () {
      if (!this.model.isInputActive())
        this.$el.addClass('inactive');
      else
        this.$el.removeClass('inactive');
    },

    onFocus: function () {
      if (this.$editable && this.model.isInputActive()) {
        this.$editable.focus();
      }
    },

    onAvatar: function (model, value, options) {
      this.$el.find('.avatar').prop('src', common.cloudinarySize(value, 80));
    },

    onSubmitMessage: function (event) {
      event.preventDefault();
      this.sendMessage();
    },

    onInputClicked: function (event) {
      this.model.trigger('input:clicked');
    },

    /*****************************************************************************************************************
     *
     * Listener
     *
     *****************************************************************************************************************/

    /**
     * Only used to detect keydown on tab and then prevent default to avoid loosing focus
     * on keypress & keyup, it's too late
     *
     * @param event
     */
    onKeyDown: function (event) {
      if (event.type != 'keydown')
        return;

      var data = keyboard._getLastKeyCode(event);
      var message = this.$editable.val();

      // Avoid loosing focus when tab is pushed
      if (data.key === keyboard.TAB)
        event.preventDefault();

      // Avoid adding new line on enter press (=submit message)
      if (data.key === keyboard.RETURN && !data.isShift)
        event.preventDefault();

      // Navigate between editable messages
      if (event.which == keyboard.UP && message === '')
        this.trigger('editPreviousInput');

      this.model.trigger('inputKeyDown', event);
    },

    onKeyUp: function (event) {
      if (event.type != 'keyup')
        return;

      var data = keyboard._getLastKeyCode(event);
      var message = this.$editable.val();
      var images = this.imagesView.list();

      if (this.rollupView.isClosed()) {
        // Send message on Enter, not shift + Enter, only if there is something to send
        if (data.key == keyboard.RETURN && !data.isShift && (message.length != 0 || images.length))
          return this.sendMessage();

        // Edit previous message on key Up
        if (data.key == keyboard.UP && ($(event.currentTarget).val() === ''))
          return this.trigger('editPreviousInput');
      }

      this.model.trigger('inputKeyUp', event);
    },

    sendMessage: function () {
      var message = this.$editable.val();
      var images = this.imagesView.list();

      // check if input is a command
      if (this.commandsView.checkInput(message) !== false) {
        this.$editable.val('');
        return false;
      }

      // empty message and no image
      // trim to detect only whitespaces message
      if (message.trim() === '' && !images.length)
        return false;

      // check length (max)
      // @todo: replace with a "withoutSmileysCodes" logic
      if (message.length > 512) {
        debug('message is too long');
        return false;
      }

      // Send message to server
      this.model.sendMessage(message, images);
      this.trigger('send');

      // reset
      this.$editable.val('');
      this.imagesView.reset();
      this.typingView.canPrintTypingEvent = true;

      // avoid line break addition in field when submitting with "Enter"
      return false;
    }

  });

  return DiscussionInputView;
});
