define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, donutDebug, currentUser, templates) {

  var debug = donutDebug('donut:input');

  var DiscussionInputView = Backbone.View.extend({

    template: templates['input.html'],

    imageTemplate: templates['input-image.html'],

    images: '',

    events: {
      'keydown .editable'       : 'onKeyDown',
      'click .send'             : 'onSubmitMessage',
      'click .add-image'        : 'onAddImage',
      'click .remove-image'     : 'onRemoveImage',
      'click .add-smiley'       : 'onOpenSmiley',
      'click .smileys .smilify' : 'onPickSmiley'
    },

    initialize: function(options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'inputFocus', this.onFocus);
      this.listenTo(this.model, 'inputActive', this.onInputActiveChange);

      this.images = {}; // should be initialized with {} on .initialize(), else all the view instances will share the same object (#110)

      this.render();
    },

    _remove: function() {
      this.remove();
    },

    render: function() {
      this.$el.html(this.template({
        avatar: $.cd.userAvatar(currentUser.get('avatar'), 80),
        bannedMessage: $.t('chat.actions.bannedMessage.__type__'.replace('__type__', this.model.get('type')))
      }));

      this.$editable = this.$el.find('.editable');
      this.$preview = this.$el.find('.preview');

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

    onKeyDown: function(event) {
      // Press enter in field handling
      if (event.type == 'keydown') {
        var key;
        var isShift;
        if (window.event) {
          key = window.event.keyCode;
          isShift = window.event.shiftKey
            ? true
            : false;
        } else {
          key = event.which;
          isShift = event.shiftKey
            ? true
            : false;
        }
        if(event.which == 13 && !isShift) {
          return this.sendMessage();
        }
        if (event.which == 38 && ($(event.currentTarget).val() === ''))
          this.trigger('editPreviousInput');
      }
    },

    onSubmitMessage: function(event) {
      event.preventDefault();
      this.sendMessage();
    },
    
    sendMessage: function() {
      var message = this.$editable.val();

      // check command
      if (this.checkCommand(message))
        return false;

      // check length (min)
      var imagesCount = _.keys(this.images).length;
      if (message == '' && imagesCount < 1) // empty message and no image
        return false;

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
        client_allowed_formats: ["png","gif", "jpeg"],
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
    onRemoveImage: function(event) {
      event.preventDefault();
      var cid = $(event.currentTarget).closest('.image').data('cloudinaryId');
      // remove from collection
      if (this.images[cid])
        delete this.images[cid];
      // remove preview
      this.$preview.find('.image[data-cloudinary-id="'+cid+'"]').remove();
      // hide previews
      if (_.keys(this.images).length < 1)
        this.hidePreview();
    },
    showPreview: function() {
      this.$preview.show();
      this.trigger('resize');
    },
    hidePreview: function() {
      this.$preview.hide();
      this.trigger('resize');
    },

    onOpenSmiley: function(event) {
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

    onPickSmiley: function(event) {
      event.preventDefault();

      var symbol = $.smilifyGetSymbolFromCode($(event.currentTarget).data('smilifyCode'));
      this.$editable.insertAtCaret(symbol);
      this.$smileyButton.popover('hide');
    },

    checkCommand: function(message) {
      var regexpCommand = /^\/([a-z]+)/i;
      if (regexpCommand.test(message)) {
        var param = {
          command : regexpCommand.exec(message.toLowerCase())[0]
        };

        // roomname
        var regexpName = /(\s+)([@#])([\w-.|^]+)/;
        if (regexpName.test(message))
          param.name = regexpName.exec(message)[0].replace(/[\s@]+/, '');

        // message, topic, reason ...
        if (param.command) {
          param.other = message.replace(regexpCommand, '');
          if (param.name)
            param.other = param.other.replace(regexpName, '');
          param.other = param.other.replace(/^[\s]+/, '');
        }

        if (this.executeCommand(param)) {
          this.$editable.val('');
          return true;
        }
      }
      return false;
    },

    executeCommand: function(param) {

      switch (param.command) {
        case '/join':
          if (param.name)
            client.roomJoin(param.name);
          break;
        case '/leave':
          if (param.name)
            client.roomLeave(param.name);
          break;
        case '/topic':
          client.roomTopic(this.model.get('name'), param.other);
          break;
        case '/op':
          client.roomOp(this.model.get('name'), param.name);
          break;
        case '/deop':
          client.roomDeop(this.model.get('name'), param.name);
          break;
        case '/kick':
          client.roomKick(this.model.get('name'), param.name, param.other);
          break;
        case '/ban':
          client.roomBan(this.model.get('name'), param.name, param.other);
          break;
        case '/deban':
          client.roomDeban(this.model.get('name'), param.name);
          break;
        case '/voice':
          client.roomVoice(this.model.get('name'), param.name);
          break;
        case '/devoice':
          client.roomDevoice(this.model.get('name'), param.name, param.other);
          break;
        case '/msg':
          if ((/^[#]/).test(param.name))
            client.roomMessage(param.name, param.other, null);
          else {
            client.userMessage(param.name, param.other, null);
          }
          break;
        default:
          return false;
      }

      return true;
    }

  });

  return DiscussionInputView;
});