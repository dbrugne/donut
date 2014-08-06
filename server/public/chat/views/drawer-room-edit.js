define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/color-picker',
  'text!templates/room-edit.html',
  'text!templates/spinner.html'
], function ($, _, Backbone, client, currentUser, ColorPicker, roomEditTemplate, spinnerTemplate) {
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

      // ask for data
      client.roomRead(this.roomName);

      // on response show form
      this.listenTo(client, 'room:read', this.onRead);
    },
    render: function() {
      // render spinner only
      this.$el.html(_.template(spinnerTemplate)());
      return this;
    },
    onRead: function(room) {

      this.roomName = room.name;

      room.isOwner = (room.owner)
          ? (room.owner.user_id == currentUser.get('user_id'))
          ? true
          : false
          : false;

      var html = this.template({room: room});
      this.$el.html(html);
      this.$el.colorify();
      this.$el.find('.website').linkify();

      var colorPicker = new ColorPicker({
        color: room.color,
        name: 'color',
        el: this.$el.find('.room-color').first()
      });

      if (room.color)
        this.trigger('color', room.color);
    },
    onSubmit: function(event) {
      event.preventDefault();

      client.roomUpdate(this.roomName, {
        description: this.$el.find('textarea[name=description]').val(),
        website: this.$el.find('input[name=website]').val(),
        color: this.$el.find('input[name=color]').val()
      });
    }

  });

  return DrawerRoomEditView;
});