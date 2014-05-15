define([
  'jquery',
  'underscore',
  'backbone',
  'models/client'
], function ($, _, Backbone, client) {
  var RoomCreateView = Backbone.View.extend({

    el: $('#room-create-modal'),

    events: {
      'click #room-create-submit': 'submit',
      'keyup #room-create-input': 'valid'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      this.listenTo(client, 'room:createSuccess', this.createSuccess);
      this.listenTo(client, 'room:createError', this.createError);

      this.$input = this.$el.find('#room-create-input');
      this.$formGroup = this.$el.find('.form-group');

      this.$el.on('shown.bs.modal', function (e) {
        that.$input.focus();
      })
    },

    show: function() {
      that = this;
      this.$el.modal('show');
    },

    hide: function() {
      this.$el.modal('hide');
    },

    render: function(rooms) {
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
      if (!this._valid()) {
        return false;
      }

      var name = '#'+this.$input.val();

      this.mainView.openRoom(name);

      this.$formGroup.removeClass('has-error').removeClass('has-success');
      this.$input.val('');
      this.hide();
    },

    createSuccess: function(data){
      // @todo : display alert with confirmation message
    },

    createError: function(data) {
      // @todo : display alert with apologize
//            var error = data.uri.error;
//            this.$formGroup.addClass('has-error').removeClass('has-success');
//            this.$el.find('.create-message').remove();
//            var html = '<p class="create-message bg-danger">'+error+'</p>';
//            this.$formGroup.before(html);
    }

  });

  return RoomCreateView;
});