define([
  'underscore',
  'backbone',
  'models/client',
  'models/user'
], function (_, Backbone, client, UserModel) {
  var CurrentUserModel = UserModel.extend({

    mute: false,

    initialize: function(options) {
      var that = this;
      this.listenTo(client, 'connecting', function() { that.set('status', 'connecting'); });
      this.listenTo(client, 'connected',     function() { that.set('status', 'online'); });
      this.listenTo(client, 'disconnected',    function() { that.set('status', 'offline'); });
      this.listenTo(client, 'reconnected',     function() { that.set('status', 'online'); });
      this.listenTo(client, 'error',      function() { that.set('status', 'error'); });

      if (this._getCookie('mute') == true)
        this.mute = true;

      this._initialize(options);
    },

    setMute: function(boolean) {
      this.mute = boolean;
      this._setCookie('mute', this.mute);
    },

    _setCookie: function(name, value, exdays) {
      exdays = exdays || 365; // 1 year by default
      var d = new Date();
      d.setTime(d.getTime() + (exdays*24*60*60*1000));
      var expires = "expires="+d.toUTCString();
      document.cookie = name + "=" + value + "; " + expires;
    },
    _getCookie: function(name) {
      var cname = name + "=";
      var ca = document.cookie.split(';');
      for (var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        var value;
        if (c.indexOf(cname) != -1)
          value = c.substring(cname.length, c.length);
        if (typeof value != 'undefined') {
          if (value == 'true') // boolean compliance
            return true;
          else if (value == 'false')
            return false;
          else
            return value;
        }
      }
      return "";
    }

  });

  return new CurrentUserModel();
});