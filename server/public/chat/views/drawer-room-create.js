define([
  'jquery',
  'underscore',
  'backbone',
  'models/client', // @todo call on rooms collection
  'text!templates/room-create.html'
], function ($, _, Backbone, client, roomCreateTemplate) {
  var DrawerRoomCreateView = Backbone.View.extend({

    template: _.template(roomCreateTemplate),

    id: 'room-create',

    events  : {
      'keyup .input': 'valid',
      'click .submit': 'submit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      this.render();

      this.$input = this.$el.find('.input');

//      var that = this;
//      this.$el.on('shown', function (e) {
//        that.$input.focus();
//      });
    },
    /**
     * Only set this.$el content
     */
    render: function() {
      var html = this.template();
      this.$el.html(html);
      return this;
    },
    valid: function(event) {
      if (this.$input.val() == '') {
        this.$el.removeClass('has-error').removeClass('has-success');
        return;
      }

      if (!this._valid()) {
        this.$el.addClass('has-error').removeClass('has-success');
      } else {
        this.$el.addClass('has-success').removeClass('has-error');
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

      this.$el.removeClass('has-error').removeClass('has-success').val('');
      this.trigger('close');
    }

  });

  return DrawerRoomCreateView;
});