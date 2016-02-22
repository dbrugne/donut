var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');
var currentUser = require('../libs/app').user;
var ImageUploader = require('./image-uploader');

var DrawerGroupEditView = Backbone.View.extend({
  template: require('../templates/drawer-group-edit.html'),

  id: 'group-edit',

  events: {
    'submit form.group-form': 'onSubmit',
    'input #groupDescription': 'onTypingDescription'
  },

  initialize: function (options) {
    this.groupId = options.group_id;

    // show spinner as temp content
    this.render();

    var what = {
      admin: true
    };
    app.client.groupRead(this.groupId, what, _.bind(function (data) {
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
    this.remove();
  },
  onResponse: function (group) {
    group.isOwner = (group.owner)
      ? (group.owner_id === currentUser.get('user_id'))
      : false;

    group.isAdmin = app.user.isAdmin();

    var currentAvatar = group.avatar;

    var html = this.template({group: group});
    this.$el.html(html);

    // description
    if (group.description) {
      this.$('.counter-description').html(i18next.t('chat.form.common.edit.left', {count: 200 - group.description.length}));
    } else {
      this.$('.counter-description').html(i18next.t('chat.form.common.edit.left', {count: 200}));
    }

    // website
    this.$website = this.$('input[name=website]');

    // avatar
    this.avatarUploader = new ImageUploader({
      el: this.$('.group-avatar').first(),
      current: currentAvatar,
      tags: 'group,avatar',
      field_name: 'avatar',
      resized_width: 200,
      resized_height: 200,
      cropping_aspect_ratio: 1, // squared avatar
      success: _.bind(this.onGroupAvatarUpdate, this)
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

    app.client.groupUpdate(this.groupId, updateData, _.bind(function (data) {
      this.$('.error').hide();
      if (data.err) {
        return this.editError(data.err);
      }
      this.trigger('close');
    }, this));
  },

  onGroupAvatarUpdate: function (data) {
    var updateData = {
      avatar: data
    };
    var that = this;
    app.client.groupUpdate(this.groupId, updateData, function (d) {
      that.$('.error').hide();
      if (d.err) {
        that.editError(d.err);
      }
    });
  },

  onTypingDescription: function (event) {
    this.$('.counter-description').html(i18next.t('chat.form.common.edit.left', {count: 200 - this.$('#groupDescription').val().length}));
  },

  checkWebsite: function () {
    var website = this.$website.val();

    if (website && (website.length < 5 || website.length > 255)) {
      return this.$('.error').html(i18next.t('chat.form.errors.website-size')).show();
    }

    if (website && !/^[^\s]+\.[^\s]+$/.test(website)) {
      return this.$('.error').html(i18next.t('chat.form.errors.website-url')).show();
    }

    return true;
  },

  editError: function (err) {
    var errors = '';
    _.each(err, function (e) {
      errors += i18next.t('chat.form.errors.' + e, {defaultValue: i18next.t('global.unknownerror')}) + '<br>';
    });
    this.$('.error').html(errors).show();
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }

});

module.exports = DrawerGroupEditView;
