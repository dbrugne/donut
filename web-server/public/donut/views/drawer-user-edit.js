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
  var DrawerUserEditView = Backbone.View.extend({
    template: templates['drawer-user-edit.html'],

    id: 'user-edit',

    events: {
      'submit form.user-form': 'onSubmit'
    },

    initialize: function (options) {
      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.userRead(currentUser.get('user_id'), null, function (data) {
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
    onResponse: function (user) {
      if (user.color) {
        this.trigger('color', user.color);
      }

      var currentAvatar = user.avatar;

      var html = this.template({user: user});
      this.$el.html(html);

      // description
      this.$('#userBio').maxlength({
        counterContainer: this.$('#userBio').siblings('.help-block').find('.counter'),
        text: i18next.t('chat.form.common.edit.left')
      });

      // website
      this.$website = this.$('input[name=website]');

      // color
      this.colorPicker = new ColorPicker({
        color: user.color,
        name: 'color',
        el: this.$('.user-color').first()
      });

      // avatar
      this.avatarUploader = new ImageUploader({
        el: this.$('.user-avatar').first(),
        current: currentAvatar,
        tags: 'user,avatar',
        field_name: 'avatar',
        resized_width: 150,
        resized_height: 150,
        cropping_aspect_ratio: 1, // squared avatar
        success: _.bind(this.onUserAvatarUpdate, this)
      });

      // poster
      this.posterUploader = new ImageUploader({
        el: this.$('.user-poster').first(),
        current: user.poster,
        tags: 'user,poster',
        field_name: 'poster',
        resized_width: 0,
        resized_height: 0,
        cropping_aspect_ratio: 0.36, // portrait
        success: _.bind(this.onUserPosterUpdate, this)
      });
    },
    onSubmit: function (event) {
      event.preventDefault();

      if (this.checkWebsite() !== true) {
        return;
      }

      var updateData = {
        bio: this.$('textarea[name=bio]').val(),
        location: this.$('input[name=location]').val(),
        website: this.$('input[name=website]').val(),
        color: this.$('input[name=color]').val()
      };

      if (this.avatarUploader.data) {
        updateData.avatar = this.avatarUploader.data;
      }

      if (this.posterUploader.data) {
        updateData.poster = this.posterUploader.data;
      }

      var that = this;
      client.userUpdate(updateData, function (data) {
        that.$('.errors').hide();
        if (data.err) {
          return that.editError(data);
        }
        that.trigger('close');
      });
    },
    onUserAvatarUpdate: function (data) {
      var updateData = {
        avatar: data
      };
      var that = this;
      client.userUpdate(updateData, function (d) {
        that.$('.errors').hide();
        if (d.err) {
          that.editError(d);
        }
      });
    },
    onUserPosterUpdate: function (data) {
      var updateData = {
        poster: data
      };
      var that = this;
      client.userUpdate(updateData, function (d) {
        that.$('.errors').hide();
        if (d.err) {
          that.editError(d);
        }
      });
    },

    checkWebsite: function () {
      var website = this.$website.val();

      if (website && website.length < 5 || website.length > 255) {
        return this.$('.errors').html(i18next.t('chat.form.errors.website-size')).show();
      }

      if (website && !/^[^\s]+\.[^\s]+$/.test(website)) {
        return this.$('.errors').html(i18next.t('chat.form.errors.website-url')).show();
      }

      return true;
    },

    editError: function (dataErrors) {
      var message = '';
      _.each(dataErrors.err, function (error) {
        message += i18next.t('chat.form.errors.' + error) + '<br>';
      });
      this.$('chat.form.errors').html(message).show();
    }
  });

  return DrawerUserEditView;
});
