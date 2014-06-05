define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/modal',
  'text!templates/room-create.html'
], function ($, _, Backbone, client, ModalView, roomCreateTemplate) {
  var RoomCreateView = ModalView.extend({

    id      : 'room-create-modal',
    title   : 'Create a New Room',
    template: _.template(roomCreateTemplate),

    events  : {
      'click #room-create-submit': 'submit',
      'keyup #room-create-input': 'valid'
    },

    _initialize: function(options) {
      this.listenTo(client, 'room:createSuccess', this.createSuccess);
      this.listenTo(client, 'room:createError', this.createError);

      this.render();

      this.$input = this.$el.find('#room-create-input');
      this.$formGroup = this.$el.find('.form-group');

      var that = this;
      this.$el.on('shown.bs.modal', function (e) {
        that.$input.focus();
      });
    },
    render: function() {
      var html = this.template();
      var $body = this.$el.find('.modal-body').first();
      $body.html(html);
      return this;
    },
    valid: function(event) {
      if (this.$input.val() == '') {
        this.$formGroup.removeClass('has-error').removeClass('has-success');
      }

      if (!this._valid()) {
        this.$formGroup.addClass('has-error').removeClass('has-success');
      } else {
        this.$formGroup.addClass('has-success').removeClass('has-error');
        this.$el.find('.create-message').fadeOut();
      }

      // Enter in field handling
      if (event.type == 'keyup') {
        if(event.which == 13) {
          this.submit();
        }
      }
    },
    /**
     * Room name should be:
     * - between 2 and 30 length
     * - accept alphanumeric characters
     * - specials: - _ \ | [ ] { } @ ^ `
     */
    _valid: function() {
      var name = '#'+this.$input.val();
      var pattern = /^#[-a-z0-9_\\|[\]{}@^`]{2,30}$/i;
      if (pattern.test(name)) {
        return true;
      } else {
        return false;
      }
    },

    submit: function() {
      if (!this._valid()) return false;

      var name = '#'+this.$input.val();

      var uri = 'room/'+name.replace('#', '');
      window.router.navigate(uri, {trigger: true});

      this.$formGroup.removeClass('has-error').removeClass('has-success');
      this.$input.val('');
      this.hide();
    },

    createError: function(data) {
      // @todo : display alert with apologize (socket should send a 'room:createerror' message)
    }

  });

  return RoomCreateView;
});