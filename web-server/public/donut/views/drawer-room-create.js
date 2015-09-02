define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'client',
  '_templates'
], function ($, _, Backbone, app, client, _templates) {
  var DrawerRoomCreateView = Backbone.View.extend({

    template: _templates['drawer-room-create.html'],

    id: 'room-create',

    events  : {
      'keyup .input': 'valid',
      'click .submit': 'submit'
    },

    initialize: function(options) {
      this.render(options.name);
      this.$input = this.$el.find('.input');
    },
    /**
     * Only set this.$el content
     */
    render: function(name) {
      var html = this.template({name: name.replace('#', '')});
      this.$el.html(html);
      return this;
    },
    reset: function() {
      this.$el.removeClass('has-error').removeClass('has-success').val('');
    },
    valid: function(event) {
      if (this.$input.val() == '') {
        this.$el.removeClass('has-error').removeClass('has-success');
        return;
      }

      var valid = this._valid();
      if (!valid)
        this.$el.addClass('has-error').removeClass('has-success');
      else
        this.$el.addClass('has-success').removeClass('has-error');

      // Enter in field handling
      if (valid && event.type == 'keyup' && event.which == 13) {
        this.submit();
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
      if (!this._valid())
        return false;

      var name = '#'+this.$input.val();
      var uri = 'room/'+name.replace('#', '');

      var that = this;
      client.roomCreate(name, function(response) {
        if (response.err == 'alreadyexists') {
          app.trigger('alert', 'error', $.t('chat.alreadyexists', {name: name, uri: uri}));
          that.reset();
          that.trigger('close');
          return;
        } else if (response.err) {
          app.trigger('alert', 'error', $.t('global.unknownerror'));
          that.reset();
          that.trigger('close');
          return;
        }

        window.router.navigate(uri, {trigger: true});
        app.trigger('alert', 'info', $.t('chat.successfullycreated', {name: name}));
        that.reset();
        that.trigger('close');
      });
    }

  });

  return DrawerRoomCreateView;
});