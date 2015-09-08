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
      'submit form.room-form': 'onSubmit',
      'change .savable': 'onChangeValue',
      'click .random-password': 'onClickRandomPassword'
    },

    initialize: function (options) {
      this.roomId = options.room_id;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.roomRead(this.roomId, null, function (err, data) {
        if (!err) {
          that.onResponse(data);
        }
      });
    },
    render: function () {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function (room) {
      if (room.color) {
        this.trigger('color', room.color);
      }

      room.isOwner = (room.owner) ?
        (room.owner.user_id === currentUser.get('user_id')) :
        false;

      room.isAdmin = (currentUser.get('admin') === true);

      // options
      this.$joinChecked = this.$el.find('.join.' + room.join_mode);
      this.$historyChecked = this.$el.find('.history.' + room.history_mode);

      var currentAvatar = room.avatar;

      var html = this.template({room: room});
      this.$el.html(html);

      // description
      this.$el.find('#roomDescription').maxlength({
        counterContainer: this.$el.find('#roomDescription').siblings('.help-block').find('.counter'),
        text: i18next.t('edit.left')
      });

      // website
      this.$website = this.$el.find('input[name=website]');

      // color
      var colorPicker = new ColorPicker({
        color: room.color,
        name: 'color',
        el: this.$el.find('.room-color').first()
      });

      // avatar
      this.avatarUploader = new ImageUploader({
        el: this.$el.find('.room-avatar').first(),
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
        el: this.$el.find('.room-poster').first(),
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
        description: this.$el.find('textarea[name=description]').val(),
        website: this.$website.val(),
        color: this.$el.find('input[name=color]').val()
      };

      if (currentUser.get('admin') === true) {
        updateData.visibility = (this.$el.find('input[name=visibility]:checked').val() === 'true');
        updateData.priority = this.$el.find('input[name=priority]').val();

        if (this.$joinChecked.attr('value') === 'password') {
          var join_password = this.$el.find('.input-password').val();
        }

        updateData.join_mode = this.$joinChecked.attr('value');
        updateData.join_mode_password = join_password;
        updateData.history_mode = this.$historyChecked.attr('value');
      }

      if (this.avatarUploader.data) {
        updateData.avatar = this.avatarUploader.data;
      }

      if (this.posterUploader.data) {
        updateData.poster = this.posterUploader.data;
      }

      var that = this;
      client.roomUpdate(this.roomId, updateData, function (data) {
        that.$el.find('.errors').hide();
        if (data.err) {
          return that.editError(data);
        }
        that.trigger('close');
      });
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

    onChangeValue: function (event) {
      var $target = $(event.currentTarget);
      var type = $target.attr('type');
      var name = $target.attr('name').substr($target.attr('name').lastIndexOf(':') + 1);

      if (type === 'radio' && name === 'join') {
        this.$joinChecked = $target;
        if (this.$joinChecked.attr('value') === 'password') {
          this.$el.find('.field-password').css('display', 'block');
          this.$el.find('.input-password').focus();
        } else {
          this.$el.find('.field-password').css('display', 'none');
        }
      }
      if (type === 'radio' && name === 'history') {
        this.$historyChecked = $target;
      }
    },

    onClickRandomPassword: function (event) {
      event.preventDefault();
      if (this.$joinChecked.attr('value') === 'password') {
        this.$el.find('.input-password').val(this.generateRandomPassword());
        this.$el.find('.input-password').focus();
      }
    },

    generateRandomPassword: function () {
      var limit = (Math.random() * 12) + 8;
      var password = '';
      var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (var i = 0; i < limit; i++) {
        var index = Math.floor(Math.random() * chars.length);
        password += chars[index];
      }
      return password;
    },

    checkWebsite: function () {
      var website = this.$website.val();

      if (website && (website.length < 5 || website.length > 255)) {
        return this.$el.find('.errors').html($.t('form.errors.website-size')).show();
      }

      if (website && !/^[^\s]+\.[^\s]+$/.test(website)) {
        return this.$el.find('.errors').html($.t('form.errors.website-url')).show();
      }

      return true;
    },

    editError: function (dataErrors) {
      var message = '';
      _.each(dataErrors.err, function (error) {
        message += $.t('form.errors.' + error) + '<br>';
      });
      this.$el.find('.errors').html(message).show();
    }
  });

  return DrawerRoomEditView;
});
