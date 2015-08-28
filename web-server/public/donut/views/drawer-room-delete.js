define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client, currentUser, templates) {
  var DrawerRoomDeleteView = Backbone.View.extend({

    template: templates['drawer-room-delete.html'],

    id: 'room-delete',

    events  : {
      'keyup .input': 'onKeyup',
      'click .submit': 'onSubmit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.roomName = options.name;
      this.roomId = options.room_id;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.roomRead(this.roomId, function(err, data) {
        if (!err)
          that.onResponse(data);
      });

      // on room:delete callback
      this.listenTo(client, 'room:delete', this.onDelete);
    },
    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function(room) {
      if (room.owner.user_id != currentUser.get('user_id') && !currentUser.isAdmin())
        return;

      this.roomName = room.name;

      // colorize drawer .opacity
      if (room.color)
        this.trigger('color', room.color);

      var html = this.template({room: room});
      this.$el.html(html);
      this.$input = this.$el.find('.input');
    },
    onSubmit: function(event) {
      event.preventDefault();
      if (!this._valid())
        return;

      client.roomDelete(this.roomName);
    },
    onDelete: function(data) {
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

      this.mainView.alert('info', $.t('edit.room.delete.success'));
      this.trigger('close');
    },
    onKeyup: function(event) {
      if (this._valid())
        this.$el.addClass('has-success');
      else
        this.$el.removeClass('has-success');

      // Enter in field handling
      if (event.type == 'keyup') {
        if(event.which == 13) {
          return this.onSubmit(event);
        }
      }
    },
    _valid: function() {
      var name = '#'+this.$input.val();
      var pattern = new RegExp('^'+this.roomName+'$', 'i');
      if (pattern.test(name)) {
        return true;
      } else {
        return false;
      }
    },

  });

  return DrawerRoomDeleteView;
});