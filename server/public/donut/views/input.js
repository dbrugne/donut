define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'views/smileys',
  'text!templates/input.html'
], function ($, _, Backbone, client, currentUser, SmileysView, InputTemplate) {
  var DiscussionMessageBoxView = Backbone.View.extend({

    template: _.template(InputTemplate),

    events: {
      'keypress .input-message':  'message',
      'click .send':              'message',
      'click .smileys-message':   'toggleSmileys'
    },

    initialize: function(options) {
      this.listenTo(this.model, 'change:status', this.onStatus);
      this.listenTo(currentUser, 'change:avatar', this.onAvatar);

      this.render();
      this.onStatus();

      // Smileys view
      this.smileysView = new SmileysView({onPick: this.pickSmiley});
      this.$el.find('.smileys-message').append(this.smileysView.$el);
      this.listenTo(this.smileysView, 'pick', this.pickSmiley);
    },

    render: function() {
      this.$el.html(this.template({
        avatar: $.cd.userAvatar(currentUser.get('avatar'), 80, currentUser.get('color'))
      }));
    },

    onAvatar: function(model, value, options) {
      this.$el.find('.avatar').prop('src', $.cd.userAvatar(value, 80, model.get('color')));
    },

    onStatus: function() {
      if (this.model.get('type') != 'onetoone') return;

      if (this.model.get('status')) {
        this.$el.find('textarea').attr('disabled', false);
      } else {
        this.$el.find('textarea').attr('disabled', true);
      }
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
      var symbol = $().smilify('symbol', smiley);
      this.$el.find('.input-message').insertAtCaret(symbol);
    },

    message: function(event) {
      if (this.model.get('type') == 'onetoone'
        &&!this.model.get('status'))
        return console.log('user visibly offline, do nothing');

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