var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var ImageUploader = require('./image-uploader');
var ColorPicker = require('./color-picker');

var DrawerGroupEditView = Backbone.View.extend({
  template: require('../templates/drawer-group-edit.html'),

  id: 'group-edit',

  events: {
    'submit form.group-form': 'onSubmit'
  },

  initialize: function (options) {
    this.groupId = options.group_id;

    // show spinner as temp content
    this.render();

    var what = {
      more: true,
      users: false,
      admin: true
    };
    client.groupRead(this.groupId, what, _.bind(function (data) {
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
    this.remove();
  },
  onResponse: function (group) {
    if (group.color) {
      this.trigger('color', group.color);
    }

    group.isOwner = (group.owner)
      ? (group.owner.user_id === currentUser.get('user_id'))
      : false;

    group.isAdmin = (currentUser.get('admin') === true);

    var currentAvatar = group.avatar;

    var html = this.template({group: group});
    this.$el.html(html);

    // description
    this.$('#groupDescription').maxlength({
      counterContainer: this.$('#groupDescription').siblings('.help-block').find('.counter'),
      text: i18next.t('chat.form.common.edit.left')
    });

    // disclaimer
    this.$('#groupDisclaimer').maxlength({
      counterContainer: this.$('#groupDisclaimer').siblings('.help-block').find('.counter'),
      text: i18next.t('chat.form.common.edit.left')
    });

    // website
    this.$website = this.$('input[name=website]');

    // color
    this.colorPicker = new ColorPicker({
      color: group.color,
      name: 'color',
      el: this.$('.group-color').first()
    });

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
      disclaimer: this.$('textarea[name=disclaimer]').val(),
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

    client.groupUpdate(this.groupId, updateData, _.bind(function (data) {
      this.$('.errors').hide();
      if (data.err) {
        return this.editError(data);
      }
      this.trigger('close');
    }, this));
  },

  onGroupAvatarUpdate: function (data) {
    var updateData = {
      avatar: data
    };
    var that = this;
    client.groupUpdate(this.groupId, updateData, function (d) {
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
      message += i18next.t('chat.form.errors.' + error) + '<br>';
    });
    this.$('.errors').html(message).show();
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }

});

module.exports = DrawerGroupEditView;
