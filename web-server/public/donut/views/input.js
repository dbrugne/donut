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
      this.listenTo(this.model, 'inputActive', this.onActiveChange);

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

      if (this.model.isInputActive() === false) { // deactivate input
        this.$el.addClass('inactive');
      } else {
        this.$el.removeClass('inactive');
      }
    },

    onActiveChange: function() {
      if (this.model.isInputActive() === false) {
        this.$el.removeClass('inactive');
        var devoices = _.reject( this.model.get('devoices'), function(devoiceUserId) {
          return (devoiceUserId.user == currentUser.get('user_id'));
        });
        this.model.set('devoices', devoices);
      } else {
        this.$el.addClass('inactive');
        this.model.get('devoices').push({ user: currentUser.get('user_id'), devoiced_at: Date.now() });
      }
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
      var regexpCommand = /^\/([a-z]+)/i;
      if (regexpCommand.test(message)) {
        var command = regexpCommand.exec(message.toLowerCase());

        // roomname #.. @..
        if (command[0] !== '/help' && command[0] !== '/ping') {
          var regexpRoomname = /(\s+)([#@])([\w-.|^]+)/;
          var roomname = regexpRoomname.exec(message);
          if (roomname)
            roomname[0] = roomname[0].replace(/^[\s]+/, '');
        }

        // username
        if (command && roomname) {
          var regexpUsername = /(\s+)([@])([\w-.|^]+)/;
          var username = regexpUsername.exec(message);
          if (username) {
            username[0] = username[0].replace(/^[\s]+[@]/, '');
          }
        }

        // message, topic, reason ...
        if (command && roomname || username) {
          var other = message.replace(regexpCommand, '');
          other = other.replace(regexpRoomname, '');
          other = other.replace(/^[\s]+/, '');
        }

        if (this.executeCommand(command, roomname, username, other)) {
          this.$editable.val('');
          return false;
        }
      }

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

    executeCommand: function(command, roomname, username, other) {

      switch (command[0]) {
        case '/join':
          if (roomname)
            client.roomJoin(roomname[0]);
          break;
        case '/leave':
          if (roomname)
            client.roomLeave(roomname[0]);
          break;
        case '/topic':
          if (roomname)
            client.roomTopic(roomname[0], other);
          break;
        case '/op':
          if (roomname && username)
            client.roomOp(roomname[0], username[0]);
          break;
        case '/deop':
          if (roomname && username)
            client.roomDeop(roomname[0], username[0]);
          break;
        case '/kick':
          if (roomname && username)
            client.roomKick(roomname[0], username[0]);
          break;
        case '/ban':
          if (roomname && username)
            client.roomBan(roomname[0], username[0], other);
          break;
        case '/deban':
          if (roomname && username)
            client.roomDeban(roomname[0], username[0]);
          break;
        default:
          return false;
      }

      return true;
    }

  });

  return DiscussionInputView;
});