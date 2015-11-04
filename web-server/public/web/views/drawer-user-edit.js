var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var ImageUploader = require('./image-uploader');
var ColorPicker = require('./color-picker');

var DrawerUserEditView = Backbone.View.extend({
  template: require('../templates/drawer-user-edit.html'),

  id: 'user-edit',

  events: {
    'submit form.user-form': 'onSubmit',
    'input #userBio': 'onTypingBio'
  },

  initialize: function (options) {
    // show spinner as temp content
    this.render();

    // ask for data
    var that = this;
    client.userRead(currentUser.get('user_id'), function (data) {
      if (!data.err) {
        that.onResponse(data);
      }
    });
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
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
    if (user.bio) {
      this.$('.counter').html(i18next.t('chat.form.common.edit.left', {count: 200 - user.bio}));
    } else {
      this.$('.counter').html(i18next.t('chat.form.common.edit.left', {count: 200}));
    }

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
      name: this.$('input[name=realname]').val(),
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
        return that.editError(data.err);
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
        that.editError(d.err);
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
        that.editError(d.err);
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

  onTypingBio: function (event) {
    this.$('.counter').html(i18next.t('chat.form.common.edit.left', {count: 200 - this.$('#userBio').val().length}));
  },

  editError: function (err) {
    this.$('chat.form.errors').html(i18next.t('chat.form.errors.' + err, {defaultValue: i18next.t('global.unknownerror')})).show();
  }
});

module.exports = DrawerUserEditView;
