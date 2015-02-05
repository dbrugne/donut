define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'collections/rooms',
  'collections/onetoones'
], function ($, _, Backbone, client, currentUser, rooms, onetoones) {
  var WindowView = Backbone.View.extend({

    el: $(window),

    focused: true,

    defaultTitle: '',

    title: '',

    titleBlinker: '',

    preventPopin: false,

    beeps: {
      'message': '',
      'mention': ''
    },
    beepPlaying: false,
    beepOn: false,

    initialize: function(options) {
      this.$window = this.$el;
      this.$document = $(document);

      this.defaultTitle = document.title; // save original title on page load

      // Load audio elements
      var that = this;
      if (typeof Audio !== 'undefined') {
        this.beepOn = true;
        var cb = function() {
          that.beepPlaying = false;
        }
        this.beeps.message = new Audio('/sounds/beep.mp3');
        this.beeps.message.onended = cb;
        this.beeps.mention = new Audio('/sounds/beepbeep.mp3');
        this.beeps.mention.onended = cb;
      }

      // Bind events to browser window
      var that = this;
      this.$window.focus(function(event) {
        that.onFocus();
      });
      this.$window.blur(function(event) {
        that.onBlur();
      });
      this.$window.on('beforeunload', function() {
        return that.onClose();
      });
      this.$window.resize(function() {
        that.onResize();
      });

      // Bind events to model
      this.listenTo(client, 'notlogged', this.onNotLogged);
    },

    renderTitle: function() {
      var title = '';

      var unread = 0;
      unread = rooms.reduce(function(unread, model) {
        return unread+model.get('unread');
      }, unread);
      unread = onetoones.reduce(function(unread, model) {
        return unread+model.get('unread');
      }, unread);

      if (unread > 0)
        title += '('+unread+') ';

      title += this.defaultTitle;

      if (this.title && this.title.length)
        title += ' | '+this.title;

      document.title = title;

      if (unread < 1) {
        clearInterval(this.titleBlinker);
        return;
      }

      // now make it blink
      var odd = title;
      var even = this.defaultTitle;
      clearInterval(this.titleBlinker);
      this.titleBlinker = setInterval(function() {
        document.title = (document.title == odd) ? even : odd;
      }, 1000);

    },
    setTitle: function(title) {
      this.title = title;
      this.renderTitle();
    },
    onBlur: function() {
      this.focused = false;
    },
    onFocus: function() {
      this.focused = true;

      // mark current focused model as read
      var model = this._getFocusedModel();
      if (model) {
        var unread = model.get('unread');
        model.set('unread', 0);
        if (unread > 0) { // avoid useless redraw on window refocus
          if (model.get('type') == 'room')
            rooms.trigger('redraw');
          else
            onetoones.trigger('redraw');
        }
      }

      this.renderTitle();
    },
    onResize: function() {
      var model = this._getFocusedModel();
      if (model)
        model.trigger('resize'); // transmit event only to the current focused model
    },
    _getFocusedModel: function() {
      var model = rooms.findWhere({focused: true});
      if (!model)
        model = onetoones.findWhere({focused: true});

      return model; // could be 'undefined'
    },
    onClose: function() {
      // sometimes we prevent exit popin
      if (this.preventPopin)
        return;
      // only if at least one discussion is open
      if ((!rooms || rooms.length < 1) && (!onetoones || onetoones.length < 1))
        return;
      // only if connected
      if (!client.isConnected())
        return;

      return $.t("chat.closemessage");
    },
    onNotLogged: function() {
      this.preventPopin = true;
      window.location.assign('/');
    },
    triggerInout: function(event, model) {
      // test if not from me (currentUser)
      if (event.get('data').username == currentUser.get('username'))
        return;
    },
    triggerMessage: function(event, model) {
      if (event.getGenericType() != 'message')
        return;

      // test if not from me (currentUser)
      if (event.get('data').username == currentUser.get('username'))
        return;

      // test if i mentioned
      var pattern = new RegExp('@\\[([^\\]]+)\\]\\(user:'+currentUser.get('user_id')+'\\)');
      var isMention = pattern.test(event.get('data').message);

      // test if current discussion of focus
      var isFocused = (this.focused && model.get('focused'))
        ? true
        : false;

      // play sound (could be played for current focused discussion, but not for my own messages)
      if (!currentUser.mute) {
        if (isMention)
          this.play('mention'); // even if discussion is focused
        else if (!isFocused)
          this.play('message'); // only if not focused
      }

      // badge and title only if discussion is not focused
      if (!isFocused) {
        // update tabs
        model.set('unread', (model.get('unread', 0)+1));
        if (model.get('type') == 'room')
          rooms.trigger('redraw');
        else
          onetoones.trigger('redraw');

        // update title
        this.renderTitle();
      }
    },
    play: function(what) {
      // @source: // http://stackoverflow.com/questions/9419263/playing-audio-with-javascript
      if (!this.beepOn)
        return; // Audio not supported
      if (this.beepPlaying)
        return;

      var beep = this.beeps[what];
      if (!beep)
        return;

      this.beepPlaying = true;
      beep.play();
    }

  });

  return new WindowView();
});
