define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/input.html'
], function ($, _, Backbone, client, currentUser, InputTemplate) {
  var DiscussionMessageBoxView = Backbone.View.extend({

    template: _.template(InputTemplate),

    events: {
      'keypress .input-message':  'message',
      'click .send':              'message'
    },

    initialize: function(options) {
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);

      this.render();
    },

    render: function() {
      this.$el.html(this.template({
        avatar: $.cd.userAvatar(currentUser.get('avatar'), 80, currentUser.get('color'))
      }));
    },

    onAvatar: function(model, value, options) {
      this.$el.find('.avatar').prop('src', $.cd.userAvatar(value, 80, model.get('color')));
    },

    message: function(event) {
      // Press-enter in field handling
      if (event.type == 'keypress') {
        var key;
        var isShift;
        if (window.event) {
          key = window.event.keyCode;
          isShift = window.event.shiftKey ? true : false;
        } else {
          key = event.which;
          isShift = event.shiftKey ? true : false;
        }
        if(isShift || event.which != 13) {
          return;
        }
      }

      // Get the message
      var inputField = this.$el.find('.input-message');
      var message = inputField.val();
      if (message == '') return false;
      if (message.length > 512) return false;

      // @todo: cleanup this code...
      if (this.model.get('type') == 'room') {
        client.roomMessage(this.model.get('name'), message);
      } else if (this.model.get('type') == 'onetoone') {
        client.userMessage(this.model.get('username'), message);
      }

      // Empty field
      inputField.val('');

      // Avoid line break addition in field when submitting with "Enter"
      return false;
    }
  });

  return DiscussionMessageBoxView;
});