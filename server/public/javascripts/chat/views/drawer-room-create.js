define([
  'jquery',
  'underscore',
  'backbone',
  'models/client', // @todo call on rooms collection
  'text!templates/room-create.html'
], function ($, _, Backbone, client, roomCreateTemplate) {
  var DrawerRoomCreateView = Backbone.View.extend({

    template: _.template(roomCreateTemplate),

    id: '#room-create-content',

    events  : {
      'keyup .input': 'valid',
      'click .submit': 'submit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      this.render();

      this.$input = this.$el.find('.input');
//      this.$submit = this.$el.find('.submit');
      this.$formGroup = this.$el.find('.form-group');

      var that = this;
      this.$el.on('shown', function (e) {
        that.$input.focus();
      });
    },
    /**
     * Only set this.$el content
     * @returns {DrawerRoomCreateView}
     */
    render: function() {
      var html = this.template();
      this.$el.html(html);
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
    _valid: function() {
      /**
       * Room name should be:
       * - between 2 and 30 length
       * - accept alphanumeric characters
       * - specials: - _ \ | [ ] { } @ ^ `
       */
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
      this.mainView.unpopin();
    }

  });

  return DrawerRoomCreateView;
});