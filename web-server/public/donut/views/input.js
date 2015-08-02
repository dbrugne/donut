define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'libs/donut-debug',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client, donutDebug, currentUser, templates) {

  var debug = donutDebug('donut:input');

  var DiscussionInputView = Backbone.View.extend({

    template: templates['input.html'],

    imageTemplate: templates['input-image.html'],

    rollupTemplate: templates['rollup.html'],

    images: '',

    KEY: {
      BACKSPACE: 8,
      TAB: 9,
      RETURN: 13,
      ESC: 27,
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40,
      COMMA: 188,
      SPACE: 32,
      HOME: 36,
      END: 35
    },

    events: {
      //'input .editable'               : 'onInput',
      'keyup .editable': 'onKeyUp',
      'keydown .editable': 'onKeyDown',
      'click .send': 'sendMessage',
      'click .add-image': 'onAddImage',
      'click .remove-image': 'onRemoveImage',
      'click .add-smiley': 'onOpenSmiley',
      'click .smileys .smilify': 'onPickSmiley',
      'hover .rollup-container li': 'onRollupHover'
    },

    initialize: function (options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);
      this.listenTo(this.model, 'inputActive', this.onActiveChange);

      this.images = {}; // should be initialized with {} on .initialize(), else all the view instances will share the same object (#110)

      this.render();
    },

    _remove: function () {
      this.remove();
    },

    render: function () {
      this.$el.html(this.template({
        avatar: $.cd.userAvatar(currentUser.get('avatar'), 80),
        bannedMessage: $.t('chat.actions.bannedMessage.__type__'.replace('__type__', this.model.get('type')))
      }));

      this.$editable = this.$el.find('.editable');
      this.$preview = this.$el.find('.preview');
      this.$rollUpCtn = this.$el.find('.rollup-container');

      if (this.model.isInputActive() === false) { // deactivate input
        this.$el.addClass('inactive');
      } else {
        this.$el.removeClass('inactive');
      }
    },

    onActiveChange: function () {
      if (this.model.isInputActive() === false) { // deactivate input
        this.$el.addClass('inactive');
      } else {
        this.$el.removeClass('inactive');
      }
    },
    //
    //onInput: function(event) {
    //  // set mention dropdown position
    //  this.$editable.siblings('.mentions-autocomplete-list')
    //    .css('bottom', this.$editable.height()+10+'px');
    //},

    onAvatar: function (model, value, options) {
      this.$el.find('.avatar').prop('src', $.cd.userAvatar(value, 80));
    },

    /**
     * Only used to detect keydown on tab and then prevent default to avoid loosing focus
     * on keypress & keyup, it's too late
     *
     * @param event
     */
    onKeyDown: function (event) {
      var data = this._getKeyCode();
      var message = this.$editable.val();

      // Avoid loosing focus when tab is pushed
      if (data.key == this.KEY.TAB)
        event.preventDefault();

      // Avoid sending empty messages
      if (data.key == this.KEY.RETURN && !data.isShift && message.length == 0) {
        event.preventDefault();
        return this.$editable.val('');
      }
    },

    onKeyUp: function (event) {
      if (event.type != 'keyup')
        return;

      var data = this._getKeyCode();
      var message = this.$editable.val();

      // Rollup Closed
      if (this.$rollUpCtn.html().length == 0) {
        if (data.key == this.KEY.RETURN && !data.isShift && message.length != 0)
          return this.sendMessage();

        if (data.key == this.KEY.UP && ($(event.currentTarget).val() === ''))
          return this.trigger('editPreviousInput');

        if (!this._isRollupCallValid(message))
          return this.onRollUpClose();

        return this.onRollUpCall(message);

        // Rollup Open
      } else {
        // Cleaned the input
        // On key up, if input is empty or push Esc
        if (message.length == 0 || data.key == this.KEY.ESC)
          return this.onRollUpClose();

        if (data.key == this.KEY.RETURN && !data.isShift && message.length != 0)
          return this.onRollUpClose(event.target);

        if (data.key == this.KEY.UP || data.key == this.KEY.DOWN || data.key == this.KEY.TAB)
          return this._rollupNavigate(data.key, event.target);

        if (!this._isRollupCallValid(message))
          return this.onRollUpClose();

        return this.onRollUpCall(message);
      }
    },

    _isRollupCallValid: function (val) {
      // get last typed parameter, separated by spaces
      var last = _.last(val.split(' '));
      if (last.length == 0)
        return false;

      if (_.indexOf(['#', '@', '/'], last.substr(0, 1)) == -1)
        return false;

      return this.onRollUpCall(last);
    },

    _rollupNavigate: function (key, target) {
      var currentLi = this.$rollUpCtn.find('li.active');
      var li = '';
      if (key == this.KEY.UP) {
        li = currentLi.prev();
        if (li.length == 0)
          li = currentLi.parent().find('li').last();
      }
      else if (key == this.KEY.DOWN || key == this.KEY.TAB) {
        li = currentLi.next();
        if (li.length == 0)
          li = currentLi.parent().find('li').first();
      }

      if (li.length != 0) {
        currentLi.removeClass('active');
        li.addClass('active');
        target.value = li.find('.cmdname').html() + ' ';
      }
    },

    _getKeyCode: function () {
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

    sendMessage: function (event) {
      // Get the message
      var that = this;
      var message = this.$editable.val().substr(0, this.$editable.val().length - 1); // Remove last return caracter

      var imagesCount = _.keys(that.images).length;
      if (message == '' && imagesCount < 1) // empty message and no image
        return false;

      // Mentions, try to find missed ones
      if (that.model.get('type') == 'room') {
        var potentialMentions = message.match(/@([-a-z0-9\._|^]{3,15})/ig); // @todo from constant
        _.each(potentialMentions, function (p) {
          var u = p.replace(/^@/, '');
          var m = that.model.users.iwhere('username', u);
          if (m) {
            message = message.replace(
              new RegExp('@' + u, 'g'),
              '@[' + m.get('username') + '](user:' + m.get('id') + ')'
            );
          }
        });
      }

      // check length (max)
      var withoutMentions = message.replace(/@\[([^\]]+)\]\(user:[^\)]+\)/gi, '$1'); // @todo from constant
      if (withoutMentions.length > 512) {
        debug('message is too long');
        return false;
      }

      // add images
      var images = [];
      if (imagesCount > 0) {
        _.each(that.images, function (i) {
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

      // reset images
      that.images = {};
      that.$preview.find('.image').remove();
      that.hidePreview();

      // Avoid line break addition in field when submitting with "Enter"
      return false;
    },

    onAddImage: function (event) {
      event.preventDefault();

      // @doc: http://cloudinary.com/documentation/upload_widget#setup
      var options = {
        upload_preset: 'discussion',
        sources: ['local'], // ['local', 'url', 'camera']
        multiple: true,
        client_allowed_formats: ["png", "gif", "jpeg"],
        max_file_size: 20000000, // 20Mo
        max_files: 5,
        thumbnail_transformation: {width: 80, height: 80, crop: 'fill'}
      };

      var that = this;
      cloudinary.openUploadWidget(options, function (err, result) {
          if (err) {
            if (err.message && err.message == 'User closed widget')
              return;
            debug('cloudinary error: ', err);
          }
          if (!result)
            return debug('cloudinary result is empty!');

          _.each(result, function (uploaded) {
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

    /*****************************************************************************************************************
     *
     * Rollup (for user, room mentions and commands list)
     *
     *****************************************************************************************************************/

    // @todo store results in view, to avoid multiple call to client ?
    // @todo package in backbone subview to allow reuse in edit-message form

    onRollUpCall: function (str) {
      var that = this;
      // @todo : yls personalise client.search() call depending search to do
      client.search(str, rooms, users, limit, light, function(data) {
        that.$rollUpCtn.html(that.rollupTemplate(data));
      });

      //client.search(str, rooms, users, limit, light, function(data) {
      //  that.$rollUpCtn.html(that.rollupTemplate(data));
      //});

      //if ('@' == str.substr(0,1))

      //// filter user list
      //  var data = that.model.users.filter(function(item) {
      //    return item.get('username').toLowerCase().indexOf(query.toLowerCase()) > -1;
      //  });
      //// decorate user list
      //data = _.map(data, function(model, key, list) {
      //  var avatar = $.cd.userAvatar(model.get('avatar'), 10);
      //  return {
      //    id      : model.get('id'),
      //    name    : model.get('username'),
      //    avatar  : avatar,
      //    type    : 'user'
      //  };
      //});
    },
    onRollUpClose: function (target) {
      if (target)
        target.value = this.$rollUpCtn.find('li.active .value').html() + ' ';

      this.$rollUpCtn.html('');
    },
    onRollupHover: function () {
      console.log('hover');
    }

  });

  return DiscussionInputView;
});