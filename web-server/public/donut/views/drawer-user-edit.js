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
      client.userRead(currentUser.get('user_id'), null, function (err, data) {
        if (!err)
          that.onResponse(data);
      });
    },
    render: function () {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function (user) {
      if (user.color)
        this.trigger('color', user.color);

      var currentAvatar = user.avatar;

      var html = this.template({user: user});
      this.$el.html(html);

      // description
      this.$el.find('#userBio').maxlength({
        counterContainer: this.$el.find('#userBio').siblings('.help-block').find('.counter'),
        text: i18next.t('chat.form.common.edit.left')
      });

      // website
      this.$website = this.$el.find('input[name=website]');

      // color
      var colorPicker = new ColorPicker({
        color: user.color,
        name: 'color',
        el: this.$el.find('.user-color').first()
      });

      // avatar
      this.avatarUploader = new ImageUploader({
        el: this.$el.find('.user-avatar').first(),
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
        el: this.$el.find('.user-poster').first(),
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

      if (this.checkWebsite() !== true)
        return;

      var updateData = {
        bio: this.$el.find('textarea[name=bio]').val(),
        location: this.$el.find('input[name=location]').val(),
        website: this.$el.find('input[name=website]').val(),
        color: this.$el.find('input[name=color]').val()
      };

      if (this.avatarUploader.data)
        updateData.avatar = this.avatarUploader.data;

      if (this.posterUploader.data)
        updateData.poster = this.posterUploader.data;

      var that = this;
      client.userUpdate(updateData, function (data) {
        that.$el.find('.errors').hide();
        if (data.err)
          return that.editError(data);
        that.trigger('close');
      });
    },
    onUserAvatarUpdate: function (data) {
      var updateData = {
        avatar: data
      };
      var that = this;
      client.userUpdate(updateData, function (d) {
        that.$el.find('.errors').hide();
        if (d.err)
          that.editError(d);
      });
    },
    onUserPosterUpdate: function (data) {
      var updateData = {
        poster: data
      };
      var that = this;
      client.userUpdate(updateData, function (d) {
        that.$el.find('.errors').hide();
        if (d.err)
          that.editError(d);
      });
    },

    checkWebsite: function () {
      var website = this.$website.val();

      if (website && website.length < 5 || website.length > 255)
        return this.$el.find('.errors').html($.t('chat.form.errors.website-size')).show();

      if (website && !/^[^\s]+\.[^\s]+$/.test(website))
        return this.$el.find('.errors').html($.t('chat.form.errors.website-url')).show();

      return true;
    },

    editError: function (dataErrors) {
      var message = '';
      _.each(dataErrors.err, function (error) {
        message += $.t('chat.form.errors.' + error) + '<br>';
      });
      this.$el.find('chat.form.errors').html(message).show();
    }
  });

  return DrawerUserEditView;
});
