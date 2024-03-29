var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');
var currentUser = require('../libs/app').user;
var ImageUploader = require('./image-uploader');

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
      admin: true
    };
    app.client.roomRead(this.roomId, what, _.bind(function (data) {
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
    this.avatarUploader.remove();
    this.posterUploader.remove();
    this.remove();
  },
  onResponse: function (room) {
    var currentAvatar = room.avatar;
    room.isAdmin = app.user.isAdmin();

    var html = this.template({room: room});
    this.$el.html(html);

    this.$errorLabel = this.$('.error-label');
    this.$error = this.$('.error');
    this.$submit = this.$('.btn-save');

    // description
    if (room.description) {
      this.$('.counter').html(i18next.t('chat.form.common.edit.left', {count: 200 - room.description.length}));
    } else {
      this.$('.counter').html(i18next.t('chat.form.common.edit.left', {count: 200}));
    }

    // website
    this.$website = this.$('input[name=website]');

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
      website: this.$website.val()
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

    this.$submit.addClass('loading');
    app.client.roomUpdate(this.roomId, updateData, _.bind(function (data) {
      this.$submit.removeClass('loading');
      this.$error.hide();
      if (data.err) {
        return this.editError(data.err);
      }
      this.trigger('close');
    }, this));
  },

  onRoomAvatarUpdate: function (data) {
    var updateData = {
      avatar: data
    };
    var that = this;
    this.$submit.addClass('loading');
    app.client.roomUpdate(this.roomId, updateData, function (d) {
      that.$submit.removeClass('loading');
      that.$error.hide();
      if (d.err) {
        that.editError(d.err);
      }
    });
  },

  onRoomPosterUpdate: function (data) {
    var updateData = {
      poster: data
    };
    var that = this;
    this.$submit.addClass('loading');
    app.client.roomUpdate(this.roomId, updateData, function (d) {
      that.$submit.removeClass('loading');
      that.$error.hide();
      if (d.err) {
        that.editError(d.err);
      }
    });
  },

  checkWebsite: function () {
    var website = this.$website.val();

    if (website && (website.length < 5 || website.length > 255)) {
      this.$errorLabel.html(i18next.t('chat.form.errors.website-size'));
      this.$error.show();
      return;
    }

    if (website && !/^[^\s]+\.[^\s]+$/.test(website)) {
      this.$errorLabel.html(i18next.t('chat.form.errors.website-url'));
      this.$error.show();
      return;
    }

    return true;
  },

  editError: function (err) {
    var errors = '';
    _.each(err, function (e) {
      errors += i18next.t('chat.form.errors.' + e, {defaultValue: i18next.t('global.unknownerror')}) + '<br>';
    });
    this.$errorLabel.html(errors);
    this.$error.show();
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
