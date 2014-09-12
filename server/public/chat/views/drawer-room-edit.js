define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/image-uploader',
  'views/color-picker',
  'text!templates/room-edit.html',
  'text!templates/spinner.html'
], function ($, _, Backbone, client, currentUser, ImageUploader, ColorPicker, roomEditTemplate, spinnerTemplate) {
  var DrawerRoomEditView = Backbone.View.extend({

    template: _.template(roomEditTemplate),

    id: 'room-edit',

    events  : {
      'submit form.room-form': 'onSubmit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.roomName = options.name;

      // show spinner as temp content
      this.render();

      // ask for (editable) data
      client.roomRead(this.roomName, true);

      // on response show form
      this.listenTo(client, 'room:read', this.onRead);

      // on room:update callback
      this.listenTo(client, 'room:update', this.onUpdate);
    },
    render: function() {
      // render spinner only
      this.$el.html(_.template(spinnerTemplate)());
      return this;
    },
    onRead: function(room) {

      this.roomName = room.name;

      // colorize drawer .opacity
      if (room.color)
        this.trigger('color', room.color);

      room.isOwner = (room.owner)
          ? (room.owner.user_id == currentUser.get('user_id'))
          ? true
          : false
          : false;

      var currentAvatar = room.avatar;

      var html = this.template({room: room});
      this.$el.html(html);

      // color form
      this.$el.find('.room').colorify();

      // description
      this.$el.find('#roomDescription').maxlength({
        counterContainer: this.$el.find('#roomDescription').siblings('.help-block').find('.counter'),
        text: $.t("edit.left")
      });

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
        field_name: 'avatar'
      });

      // poster
      this.posterUploader = new ImageUploader({
        el: this.$el.find('.room-poster').first(),
        current: room.poster,
        tags: 'room,poster',
        field_name: 'poster'
      });
    },
    onSubmit: function(event) {
      event.preventDefault();

      var updateData = {
        description: this.$el.find('textarea[name=description]').val(),
        website: this.$el.find('input[name=website]').val(),
        color: this.$el.find('input[name=color]').val()
      };

      if (this.avatarUploader.data)
        updateData.avatar = this.avatarUploader.data;

      if (this.posterUploader.data)
        updateData.poster = this.posterUploader.data;

      client.roomUpdate(this.roomName, updateData);
    },
    onUpdate: function(data) {
      if (!data.name
        || data.name.toLocaleLowerCase() != this.roomName.toLocaleLowerCase())
        return;

      this.$el.find('.errors').hide();

      if (!data.success) {
        var message = '';
        _.each(data.errors, function(error) {
          message += error+'<br>';
        });
        this.$el.find('.errors').html(message).show();
        return;
      }

      this.trigger('close');
    }

  });

  return DrawerRoomEditView;
});