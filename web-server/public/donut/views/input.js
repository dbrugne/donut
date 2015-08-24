define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'libs/donut-debug',
  'libs/keyboard',
  'models/current-user',
  'views/input-rollup',
  'views/input-typing',
  'views/input-images',
  '_templates'
], function ($, _, Backbone, common, donutDebug, keyboard, currentUser, RollupView, ViewTyping, ImagesView, templates) {

  var debug = donutDebug('donut:input');

  var DiscussionInputView = Backbone.View.extend({

    template: templates['input.html'],

    events: {
      'keyup .editable'         : 'onKeyUp',
      'keydown .editable'       : 'onKeyDown',
      'input .editable'         : 'onInput',
      'click .send'             : 'onSubmitMessage',
      'click .add-smiley'       : 'onOpenSmiley',
      'click .smileys .smilify' : 'onPickSmiley'
    },

    initialize: function (options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'inputFocus', this.onFocus);
      this.listenTo(this.model, 'inputActive', this.onInputActiveChange);

      this.render();

      this.rollupView = new RollupView({
        el: this.$el,
        model: this.model
      });
      this.typingView = new ViewTyping({
        el: this.$('.typing-container'),
        model: this.model
      });
      this.imagesView = new ImagesView({
        el: this.$el,
        model: this.model
      });
    },

    _remove: function () {
      this.remove();
    },

    render: function () {
      this.$el.html(this.template({
        avatar: common.cloudinarySize(currentUser.get('avatar'), 80),
        bannedMessage: $.t('chat.actions.bannedMessage.__type__'.replace('__type__', this.model.get('type')))
      }));

      this.$editable = this.$('.editable');
      this.$rollup = this.$('.rollup-container');

      if (!this.model.isInputActive())
        this.$el.addClass('inactive');
      else
        this.$el.removeClass('inactive');
    },

    onInputActiveChange: function() {
      if (!this.model.isInputActive())
        this.$el.addClass('inactive');
      else
        this.$el.removeClass('inactive');
    },

    onFocus: function() {
      if (this.$editable)
        this.$editable.focus();
    },

    onAvatar: function(model, value, options) {
      this.$el.find('.avatar').prop('src', common.cloudinarySize(value, 80));
    },

    onSubmitMessage: function(event) {
      event.preventDefault();
      this.sendMessage();
    },

    /*****************************************************************************************************************
     *
     * Smileys
     *
     *****************************************************************************************************************/

    onOpenSmiley: function (event) {
      event.preventDefault();

      if (!this.$smileyButton) {
        this.$smileyButton = $(event.currentTarget);

        this.$smileyButton.popover({
          animation: false,
          container: this.$el,
          content: $.smilifyHtmlList(),
          html: true,
          placement: 'top'
        });

        this.$smileyButton.popover('show'); // show manually on first click, then popover has bound a click event on popover toggle action
      }
    },
    onPickSmiley: function (event) {
      event.preventDefault();

      var symbol = $.smilifyGetSymbolFromCode($(event.currentTarget).data('smilifyCode'));
      this.$editable.insertAtCaret(symbol);
      this.$smileyButton.popover('hide');
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
    onKeyDown: function(event) {
      if (event.type != 'keydown')
        return;

      var data = keyboard._getLastKeyCode();
      var message = this.$editable.val();

      // Avoid loosing focus when tab is pushed
      if (data.key === keyboard.TAB)
        event.preventDefault();

      // Avoid adding new line on enter press (=submit message)
      if (data.key === keyboard.RETURN && !data.isShift)
        event.preventDefault();

      // Avoid setting cursor at end of tab input
      this.rollupView.cursorPosition = null;
      if (data.key === keyboard.DOWN || data.key === keyboard.UP)
        this.rollupView.cursorPosition = this.$editable.getCursorPosition();

      // Navigate between editable messages
      if (event.which == keyboard.UP && message === '')
        this.trigger('editPreviousInput');
    },

    onKeyUp: function (event) {
      if (event.type != 'keyup')
        return;

      var data = keyboard._getLastKeyCode();
      var message = this.$editable.val();
      var images = this.imagesView.list();

      // Rollup Closed
      if (this.$rollup.html().length == 0) {
        // Send message on Enter, not shift + Enter, only if there is something to send
        if (data.key == keyboard.RETURN && !data.isShift && (message.length != 0 || images.length))
          return this.sendMessage();

        // Edit previous message on key Up
        if (data.key == keyboard.UP && ($(event.currentTarget).val() === ''))
          return this.trigger('editPreviousInput');
      }

      this.model.trigger('inputKeyUp', event);
    },

    onInput: function() {
      this.model.trigger('inputInput', event);
    },

    sendMessage: function() {
      var message = this.$editable.val();
      var images = this.imagesView.list();
      
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