define([
  'jquery',
  'underscore',
  'backbone',
  '_templates'
], function ($, _, Backbone, _templates) {
  var DrawerRoomCreateView = Backbone.View.extend({

    template: _templates['drawer-room-create.html'],

    id: 'room-create',

    events  : {
      'keyup .input': 'valid',
      'click .submit': 'submit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      this.render();

      this.$input = this.$el.find('.input');
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
          return;
        }
      }
    },
    _valid: function() {
      var name = '#'+this.$input.val();
      var pattern = /^#[-a-z0-9\._|[\]^]{3,24}$/i;
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