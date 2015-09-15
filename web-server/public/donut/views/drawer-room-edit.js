'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'client',
  'models/current-user',
  'views/image-uploader',
  'views/color-picker',
  '_templates'
], function ($, _, Backbone, i18next, client, currentUser, ImageUploader, ColorPicker, templates) {
  var DrawerRoomEditView = Backbone.View.extend({
    template: templates['drawer-room-edit.html'],

    id: 'room-edit',

    events: {
      'submit form.room-form': 'onSubmit'
//    'change input[name="mode"]': 'onChangeMode'
    },

    initialize: function (options) {
      this.roomId = options.room_id;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.roomRead(this.roomId, null, function (data) {
        if (!data.err) {
          that.onResponse(data);
        }
      });
    },
    render: function () {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    _remove: function () {
      this.colorPicker.remove();
      this.avatarUploader.remove();
      this.posterUploader.remove();
      this.remove();
    },
    onResponse: function (room) {
      if (room.color) {
        this.trigger('color', room.color);
      }

      room.isOwner = (room.owner)
        ? (room.owner.user_id === currentUser.get('user_id'))
        : false;

      room.mode = room.join_mode;

      room.isAdmin = (currentUser.get('admin') === true);

      var currentAvatar = room.avatar;

      var html = this.template({room: room});
      this.$el.html(html);

      // description
      this.$('#roomDescription').maxlength({
        counterContainer: this.$('#roomDescription').siblings('.help-block').find('.counter'),
        text: i18next.t('chat.form.common.edit.left')
      });

      // website
      this.$website = this.$('input[name=website]');

      // color
      this.colorPicker = new ColorPicker({
        color: room.color,
        name: 'color',
        el: this.$('.room-color').first()
      });

      // avatar
      this.avatarUploader = new ImageUploader({
        el: this.$('.room-avatar').first(),
        current: currentAvatar,
        tags: 'room,avatar',
        field_name: 'avatar',
        resized_width: 200,
        resized_height: 200,
        cropping_aspect_ratio: 1, // squared avatar
        success: _.bind(this.onRoomAvatarUpdate, this)
      });

      // poster
      this.posterUploader = new ImageUploader({
        el: this.$('.room-poster').first(),
        current: room.poster,
        tags: 'room,poster',
        field_name: 'poster',
        resized_width: 0,
        resized_height: 0,
        cropping_aspect_ratio: 0.36, // portrait
        success: _.bind(this.onRoomPosterUpdate, this)
      });
    },
    onSubmit: function (event) {
      event.preventDefault();

      if (this.checkWebsite() !== true) {
        return;
      }

      var updateData = {
        description: this.$('textarea[name=description]').val(),
        website: this.$website.val(),
        color: this.$('input[name=color]').val()
      };

      if (currentUser.get('admin') === true) {
        updateData.visibility = (this.$('input[name=visibility]:checked').val() === 'true');
        updateData.priority = this.$('input[name=priority]').val();

        // mode
        var checked = this.$('[name="mode"]:checked');
        if (!checked.length) {
          // @todo handle error
          return;
        }
        updateData.mode = checked.attr('value');
      }

      if (this.avatarUploader.data) {
        updateData.avatar = this.avatarUploader.data;
      }

      if (this.posterUploader.data) {
        updateData.poster = this.posterUploader.data;
      }

      client.roomUpdate(this.roomId, updateData, _.bind(function (data) {
        this.$('.errors').hide();
        if (data.err) {
          return this.editError(data);
        }
        this.trigger('close');
      }, this));
    },

    onRoomAvatarUpdate: function (data) {
      var updateData = {
        avatar: data
      };
      var that = this;
      client.roomUpdate(this.roomId, updateData, function (d) {
        that.$el.find('.errors').hide();
        if (d.err) {
          that.editError(d);
        }
      });
    },

    onRoomPosterUpdate: function (data) {
      var updateData = {
        poster: data
      };
      var that = this;
      client.roomUpdate(this.roomId, updateData, function (d) {
        that.$el.find('.errors').hide();
        if (d.err) {
          that.editError(d);
        }
      });
    },

//    onChangeMode: function (event) {
//      var $target = $(event.currentTarget).first();
//      if ($target.attr('type') === 'radio' && $target.attr('name') === 'mode') {
//        if ($target.attr('value') !== 'public') {
//
//        } else { // private
//
//        }
//      }
//    },

    checkWebsite: function () {
      var website = this.$website.val();

      if (website && (website.length < 5 || website.length > 255)) {
        return this.$('.errors').html($.t('chat.form.errors.website-size')).show();
      }

      if (website && !/^[^\s]+\.[^\s]+$/.test(website)) {
        return this.$('.errors').html($.t('chat.form.errors.website-url')).show();
      }

      return true;
    },

    editError: function (dataErrors) {
      var message = '';
      _.each(dataErrors.err, function (error) {
        message += $.t('chat.form.errors.' + error) + '<br>';
      });
      this.$('.errors').html(message).show();
    }

  });

  return DrawerRoomEditView;
});
