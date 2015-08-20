define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'libs/keyboard',
  'models/current-user',
  'views/input-rollup',
  'views/input-commands',
  'views/input-typing',
  '_templates'
], function ($, _, Backbone, donutDebug, keyboard, currentUser, RollupView, CommandsView, TypingView, templates) {

  var debug = donutDebug('donut:input');

  var DiscussionInputView = Backbone.View.extend({

    template: templates['input.html'],

    imageTemplate: templates['input-image.html'],

    images: '',

    events: {
      'keyup .editable'         : 'onKeyUp',
      'keydown .editable'       : 'onKeyDown',
      'input .editable'         : 'onInput',
      'click .send'             : 'onSubmitMessage',
      'click .add-image'        : 'onAddImage',
      'click .remove-image'     : 'onRemoveImage',
      'click .add-smiley'       : 'onOpenSmiley',
      'click .smileys .smilify' : 'onPickSmiley'
    },

    initialize: function (options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'inputFocus', this.onFocus);
      this.listenTo(this.model, 'inputActive', this.onInputActiveChange);

      this.images = {}; // should be initialized with {} on .initialize(), else all the view instances will share the same object (#110)

      this.render();

      this.rollupView = new RollupView({
        el: this.$el,
        model: this.model
      });
      this.commandsView = new CommandsView({
        model: this.model 
      });
      this.typingView = new TypingView({
        el: this.$('.typing-container'),
        model: this.model
      });
    },

    _remove: function () {
      this.remove();
    },

    render: function () {
      this.$el.html(this.template({
        avatar: $.cd.userAvatar(currentUser.get('avatar'), 80),
        bannedMessage: $.t('chat.actions.bannedMessage.__type__'.replace('__type__', this.model.get('type')))
      }));

      this.$editable = this.$('.editable');
      this.$preview = this.$('.preview');

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
      this.$el.find('.avatar').prop('src', $.cd.userAvatar(value, 80));
    },
    
    onSubmitMessage: function(event) {
      event.preventDefault();
      this.sendMessage();
    },
    
    sendMessage: function() {
      var message = this.$editable.val();

      // Delete the whitespace character before and after message
      message = message.trim();

      // check command
      if (this.checkCommand(message)) {
        this.$editable.val('');
        return false;
      }

      // check length (min)
      var imagesCount = _.keys(this.images).length;
      if (message == '' && imagesCount < 1) { // empty message and no image
        this.$editable.val('');
        return false;
      }
      
      // check length (max)
      // @todo: replace with a "withoutSmileysCodes" logic
      //var withoutMentions = message.replace(/@\[([^\]]+)\]\(user:[^\)]+\)/gi, '$1');
      if (message.length > 512) {
        debug('message is too long');
        return false;
      }

      // add images
      var images = [];
      if (imagesCount > 0) {
        _.each(this.images, function(i) {
          images.push({
            public_id: i.public_id,
            version: i.version,
            path: i.path
          });
        });
      }
      // Send message to server
      this.model.sendMessage(message, images);
      this.trigger('send');

      // Empty field
      this.$editable.val('');

      // reset images
      this.images = {};
      this.$preview.find('.image').remove();
      this.hidePreview();

      // Avoid line break addition in field when submitting with "Enter"
      return false;
    },

    onAddImage: function(event) {
      event.preventDefault();

      // @doc: http://cloudinary.com/documentation/upload_widget#setup
      var options = {
        upload_preset: 'discussion',
        sources: ['local'], // ['local', 'url', 'camera']
        multiple: true,
        client_allowed_formats: ["png", "gif", "jpeg"],
        max_file_size: 20000000, // 20Mo
        max_files: 5,
        thumbnail_transformation: { width: 80, height: 80, crop: 'fill' }
      };

      var that = this;
      cloudinary.openUploadWidget(options, function(err, result) {
          if (err) {
            if (err.message && err.message == 'User closed widget')
              return;
            debug('cloudinary error: ', err);
          }
          if (!result)
            return debug('cloudinary result is empty!');

          _.each(result, function(uploaded) {
            // render preview
            that.$preview.find('.add-image').before(that.imageTemplate({data: uploaded}));
            // add to collection
            that.images[uploaded.public_id] = uploaded;
            // show preview
            that.showPreview();
          });
        }
      );
    },
    onRemoveImage: function (event) {
      event.preventDefault();
      var cid = $(event.currentTarget).closest('.image').data('cloudinaryId');
      // remove from collection
      if (this.images[cid])
        delete this.images[cid];
      // remove preview
      this.$preview.find('.image[data-cloudinary-id="' + cid + '"]').remove();
      // hide previews
      if (_.keys(this.images).length < 1)
        this.hidePreview();
    },
    showPreview: function () {
      this.$preview.show();
      this.trigger('resize');
    },
    hidePreview: function () {
      this.$preview.hide();
      this.trigger('resize');
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

    /**********************************************************
     * 
     * Commands
     * 
     **********************************************************/

    checkCommand: function(message) {
      var regexpCommand = /^\/([a-z]+)/i;
      if (!regexpCommand.test(message))
        return false;

      var command = regexpCommand.exec(message.toLowerCase())[1];
      if (!this.commandsView.commands[command])
        return false;

      var commandObj = this.commandsView.commands[command];

      var paramsString = message.replace(regexpCommand, '');
      paramsString = paramsString.replace(/^[\s]+/, '');

      var parameters = paramsString.match(this.commandsView.parameters[commandObj.parameters]);

      this.commandsView[command](parameters);
      return true;
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

      // Navigate between editable messages
      if (event.which == keyboard.UP && message === '')
        this.trigger('editPreviousInput');

      this.model.trigger('inputKeyDown', event);
    },

    onKeyUp: function (event) {
      if (event.type != 'keyup')
        return;

      var data = keyboard._getLastKeyCode();
      var message = this.$editable.val();

      if (this.rollupView.isClosed()) {
        // Send message on Enter, not shift + Enter, only if there is something to send
        if (data.key == keyboard.RETURN && !data.isShift && message.length != 0)
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

      // check command
      if (this.checkCommand(message)) {
        this.$editable.val('');
        return false;
      }
      
      var trimmedMessage = message.trim(); // only white character message detection
      var imagesCount = _.keys(this.images).length;
      if (trimmedMessage === '' && imagesCount < 1) // empty message and no image
        return false;

      // check length (max)
      // @todo: replace with a "withoutSmileysCodes" logic
      if (message.length > 512) {
        debug('message is too long');
        return false;
      }

      // add images
      var images = [];
      if (imagesCount > 0)
        _.each(this.images, function(i) {
          images.push({
            public_id: i.public_id,
            version: i.version,
            path: i.path
          });
        });

      // Send message to server
      this.model.sendMessage(message, images);
      this.trigger('send');

      // Empty field
      this.$editable.val('');

      // reset images
      this.images = {};
      this.$preview.find('.image').remove();
      this.hidePreview();

      this.typingView.canPrintTypingEvent = true;

      // Avoid line break addition in field when submitting with "Enter"
      return false;
    }

  });

  return DiscussionInputView;
});