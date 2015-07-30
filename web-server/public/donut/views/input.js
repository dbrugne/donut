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
      'input .editable'               : 'onInput',
      'keypress .editable'            : 'onKeyPress',
      'click .send'                   : 'sendMessage',
      'click .add-image'              : 'onAddImage',
      'click .remove-image'           : 'onRemoveImage',
      'click .add-smiley'             : 'onOpenSmiley',
      'click .smileys .smilify'       : 'onPickSmiley'
    },

    initialize: function(options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'inputActive', this.onActiveChange);

      this.images = {}; // should be initialized with {} on .initialize(), else all the view instances will share the same object (#110)

      this.render();
    },

    _remove: function() {
      this.$editable.mentionsInput('reset');
      this.remove();
    },

    render: function() {
      this.$el.html(this.template({
        avatar: $.cd.userAvatar(currentUser.get('avatar'), 80),
        bannedMessage: $.t('chat.actions.bannedMessage.__type__'.replace('__type__', this.model.get('type')))
      }));

      this.$editable = this.$el.find('.editable');
      this.$preview = this.$el.find('.preview');

      var that = this;

      // mentions initialisation
      this.$editable.mentionsInput({
        minChars: 1,
        elastic: false,
        allowRepeat: true,
        onDataRequest: function (mode, query, callback) {
          if (that.model.get('type') != 'room')
            return [];
          // filter user list
          var data = that.model.users.filter(function(item) {
            return item.get('username').toLowerCase().indexOf(query.toLowerCase()) > -1;
          });
          // decorate user list
          data = _.map(data, function(model, key, list) {
            var avatar = $.cd.userAvatar(model.get('avatar'), 10);
            return {
              id      : model.get('id'),
              name    : model.get('username'),
              avatar  : avatar,
              type    : 'user'
            };
          });

          callback.call(this, data);
        }
      });

      if (this.model.isInputActive(currentUser.get('user_id')) === false) { // desactivate input
        this.$el.addClass('inactive');
      } else {
        this.$el.removeClass('inactive');
      }
    },

    onActiveChange: function(userId) {
      if (this.model.isInputActive(userId) === false) { // desactivate input
        this.$el.addClass('inactive');
      } else {
        this.$el.removeClass('inactive');
      }
    },

    onInput: function(event) {
      // set mention dropdown position
      this.$editable.siblings('.mentions-autocomplete-list')
        .css('bottom', this.$editable.height()+10+'px');
    },

    onAvatar: function(model, value, options) {
      this.$el.find('.avatar').prop('src', $.cd.userAvatar(value, 80));
    },

    onKeyPress: function(event) {
      // Press enter in field handling
      if (event.type == 'keypress') {
        var key;
        var isShift;
        if (window.event) {
          key = window.event.keyCode;
          isShift = window.event.shiftKey ? true : false;
        } else {
          key = event.which;
          isShift = event.shiftKey ? true : false;
        }
        if(event.which == 13 && !isShift) {
          return this.sendMessage();
        }
      }
    },

    sendMessage: function(event) {
      // Get the message
      var that = this;
      this.$editable.mentionsInput('val', function(message) {
        // check length (min)
        var imagesCount = _.keys(that.images).length;
        if (message == '' && imagesCount < 1) // empty message and no image
          return false;

        // Mentions, try to find missed ones
        if (that.model.get('type') == 'room') {
          var potentialMentions = message.match(/@([-a-z0-9\._|^]{3,15})/ig);
          _.each(potentialMentions, function(p) {
            var u = p.replace(/^@/, '');
            var m = that.model.users.iwhere('username', u);
            if (m) {
              message = message.replace(
                new RegExp('@'+u, 'g'),
                  '@['+ m.get('username')+'](user:'+m.get('id')+')'
              );
            }
          });
        }

        // check length (max)
        var withoutMentions = message.replace(/@\[([^\]]+)\]\(user:[^\)]+\)/gi, '$1');
        if (withoutMentions.length > 512) {
          debug('message is too long');
          return false;
        }

        // add images
        var images = [];
        if (imagesCount > 0) {
          _.each(that.images, function(i) {
            images.push({
              public_id: i.public_id,
              version: i.version,
              path: i.path
            });
          });
        }

        // Send message to server
        that.model.sendMessage(message, images);
        that.trigger('send');

        // Empty field
        that.$editable.val('');
        that.$editable.mentionsInput('reset');

        // reset images
        that.images = {};
        that.$preview.find('.image').remove();
        that.hidePreview();
      });

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
    }

  });

  return DiscussionInputView;
});