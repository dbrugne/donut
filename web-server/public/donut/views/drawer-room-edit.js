define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/image-uploader',
  'views/color-picker',
  '_templates'
], function ($, _, Backbone, client, currentUser, ImageUploader, ColorPicker, templates) {
  var DrawerRoomEditView = Backbone.View.extend({

    template: templates['drawer-room-edit.html'],

    id: 'room-edit',

    events  : {
      'submit form.room-form': 'onSubmit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.roomName = options.name;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.roomRead(this.roomName, function(err, data) {
        if (!err)
          that.onResponse(data);
      });
    },
    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function(room) {
      this.roomName = room.name;

      if (room.color)
        this.trigger('color', room.color);

      room.isOwner = (room.owner)
          ? (room.owner.user_id == currentUser.get('user_id'))
          ? true
          : false
          : false;

      room.isAdmin = (currentUser.get('admin') === true)
        ? true
        : false;

      var currentAvatar = room.avatar;

      var html = this.template({room: room});
      this.$el.html(html);

      // description
      this.$el.find('#roomDescription').maxlength({
        counterContainer: this.$el.find('#roomDescription').siblings('.help-block').find('.counter'),
        text: $.t("edit.left")
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
    onSubmit: function(event) {
      event.preventDefault();

      if (this.checkWebsite() !== true)
        return;

      var updateData = {
        description: this.$el.find('textarea[name=description]').val(),
        website: this.$website.val(),
        color: this.$el.find('input[name=color]').val()
      };

      if (currentUser.get('admin') === true) {
        updateData.visibility = (this.$el.find('input[name=visibility]:checked').val() == 'true')
          ? true
          : false;
        updateData.priority = this.$el.find('input[name=priority]').val();
      }

      if (this.avatarUploader.data)
        updateData.avatar = this.avatarUploader.data;

      if (this.posterUploader.data)
        updateData.poster = this.posterUploader.data;

      var that = this;
      client.roomUpdate(this.roomName, updateData, function(data) {
        that.$el.find('.errors').hide();
        if (data.err)
          return that.editError(data);
        that.trigger('close');
      });
    },

    onRoomAvatarUpdate: function (data) {
      var updateData = {
        avatar: data
      };
      var that = this;
      client.roomUpdate(this.roomName, updateData, function (d) {
        that.$el.find('.errors').hide();
        if (d.err)
          that.editError(d);
      });
    },

    onRoomPosterUpdate: function (data) {
      var updateData = {
        poster: data
      };
      var that = this;
      client.roomUpdate(this.roomName, updateData, function (d) {
        that.$el.find('.errors').hide();
        if (d.err)
          that.editError(d);
      });
    },

    checkWebsite: function() {
      var website = this.$website.val();

      if (website && (website.length < 5 || website.length > 255))
        return this.$el.find('.errors').html(t('edit.errors.website-size')).show();

      if (website && !/^[^\s]+\.[^\s]+$/.test(website))
        return this.$el.find('.errors').html(t('edit.errors.website-url')).show();

      return true;
    },

    editError: function(dataErrors) {
      var message = '';
      _.each(dataErrors.err, function (error) {
        message += t('edit.errors.' + error)+'<br>';
      });
      this.$el.find('.errors').html(message).show();
    }
  });

  return DrawerRoomEditView;
});