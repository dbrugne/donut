var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var ImageUploader = require('./image-uploader');
var ColorPicker = require('./color-picker');

var DrawerRoomEditView = Backbone.View.extend({
  template: require('../templates/drawer-room-edit.html'),

  id: 'room-edit',

  events: {
    'submit form.room-form': 'onSubmit',
    'input #roomDescription': 'onTypingDescription'
  },

  initialize: function (options) {
    this.roomId = options.room_id;

    // show spinner as temp content
    this.render();

    var what = {
      more: true,
      users: false,
      admin: true
    };
    client.roomRead(this.roomId, what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
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
  onResponse: function (room) {
    if (room.color) {
      this.trigger('color', room.color);
    }

    room.isOwner = (room.owner)
      ? (room.owner.user_id === currentUser.get('user_id'))
      : false;

    room.isAdmin = (currentUser.get('admin') === true);

    var currentAvatar = room.avatar;

    var html = this.template({room: room});
    this.$el.html(html);

    // description
    if (room.description) {
      this.$('.counter').html(i18next.t('chat.form.common.edit.left', {count: 200 - room.description.length}));
    } else {
      this.$('.counter').html(i18next.t('chat.form.common.edit.left', {count: 200}));
    }

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

    this.initializeTooltips();
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
      that.$('.errors').hide();
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
      that.$('.errors').hide();
      if (d.err) {
        that.editError(d);
      }
    });
  },

  checkWebsite: function () {
    var website = this.$website.val();

    if (website && (website.length < 5 || website.length > 255)) {
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
      message += i18next.t('chat.form.errors.' + error, {defaultValue: 'unknown'}) + '<br>';
    });
    this.$('.errors').html(message).show();
  },

  onTypingDescription: function (event) {
    this.$('.counter').html(i18next.t('chat.form.common.edit.left', {count: 200 - this.$('#roomDescription').val().length}));
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }

});

module.exports = DrawerRoomEditView;
