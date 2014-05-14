define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/smileys',
  'text!templates/messagebox.html'
], function ($, _, Backbone, client, SmileysView, MessageBoxTemplate) {
  var DiscussionMessageBoxView = Backbone.View.extend({

    template: _.template(MessageBoxTemplate),

    events: {
      'keypress .input-message':  'message',
      'click .send-message':      'message',
      'click .smileys-message':   'toggleSmileys'
    },

    initialize: function(options) {
      this.render();

      // Smileys view
      this.smileysView = new SmileysView({onPick: this.pickSmiley});
      this.$el.find('.smileys-message').append(this.smileysView.$el);
      this.listenTo(this.smileysView, 'pick', this.pickSmiley);
    },

    render: function() {
      this.$el.html(this.template());
    },

    toggleSmileys: function(event) {
      var $clicked = $(event.currentTarget);

      // Recalculate position
      var position = $clicked.position();
      var newTop = position.top - this.smileysView.$el.outerHeight();
      var newLeft = (position.left + ($clicked.outerWidth()/2)) - (this.smileysView.$el.outerWidth()/2);
      this.smileysView.$el.css('top', newTop);
      this.smileysView.$el.css('left', newLeft);
      this.smileysView.$el.toggle();
    },

    pickSmiley: function(smiley) {
      this.$el.find('.input-message').insertAtCaret(smiley.symbol);
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
      if (message == '') {
        return false;
      }

      // @todo: cleanup this code...
      if (this.model.get('type') == 'room') {
        client.roomMessage(this.model.get('name'), message);
      } else if (this.model.get('type') == 'onetoone') {
        client.userMessage(this.model.get('user_id'), message);
      }

      // Empty field
      inputField.val('');

      // Avoid line break addition in field when submitting with "Enter"
      return false;
    }
  });

  return DiscussionMessageBoxView;
});