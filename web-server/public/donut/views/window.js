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

    beep: '',
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
        this.beep = new Audio('/sounds/beep.mp3');
        this.beep.onended = cb;
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

      // determine if something 'new'
      var thereIsNew = false;
      thereIsNew = rooms.some(function(d) { // first looks in rooms
        return d.isThereNew();
      });
      if (!thereIsNew)
        thereIsNew = onetoones.some(function(d) { // then looks in onetoones
          return d.isThereNew();
        });

      if (thereIsNew)
        title += $.t('chat.unread.title') + ' ';

      title += this.defaultTitle;

      if (this.title && this.title.length)
        title += ' | '+this.title;

      document.title = title;

      if (!thereIsNew) {
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
        var thereIsNew = model.isThereNew();
        model.resetNew();
        if (thereIsNew)
          this.trigger('redraw-block'); // avoid useless redraw on window refocus

        model.trigger('windowRefocused'); // mark visible as read for focused discussion when window recover its focus
      }

      this.renderTitle();
    },
    onResize: function() {
      var model = this._getFocusedModel();
      if (model)
        model.trigger('resize'); // transmit event only to the current focused model
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

    _getFocusedModel: function() {
      var model = rooms.findWhere({focused: true});
      if (!model)
        model = onetoones.findWhere({focused: true});

      return model; // could be 'undefined'
    },

    onNotLogged: function() {
      this.preventPopin = true;
      window.location.assign('/');
    },


    /***************************************************
     * Notifications
     ***************************************************/

    triggerInout: function(event, model) {
      if (event.get('type') != 'room:in')
        return;

      // test if not from me (currentUser)
      if (event.get('data').username == currentUser.get('username'))
        return;

      // test if i'm owner or op
      if (!model.currentUserIsOwner() && !model.currentUserIsOp())
        return;

      // play sound (even if discussion/window is focused or not)
      this.play();

      // test if current discussion is focused
      var isFocused = (this.focused && model.get('focused'))
          ? true
          : false;

      // badge and title only if discussion is not focused
      if (!isFocused) {
        model.set('newuser', true); // will trigger tab badge and title when rendering

        // update tabs
        this.trigger('redraw-block');

        // update title
        this.renderTitle();
      }
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

      // test if current discussion is focused
      var isFocused = (this.focused && model.get('focused'))
        ? true
        : false;

      // play sound (could be played for current focused discussion, but not for my own messages)
      if (isMention)
        this.play(); // even if discussion is focused
      else if (!isFocused)
        this.play(); // only if not focused

      // badge and title only if discussion is not focused
      if (!isFocused) {
        if (!isMention)
          model.set('newmessage', true); // will trigger tab badge and title when rendering
        else
          model.set('newmention', true);

        // update tabs
        this.trigger('redraw-block');

        // update title
        this.renderTitle();
      }
    },
    play: function() {
      if (currentUser.mute)
        return;

      // @source: // http://stackoverflow.com/questions/9419263/playing-audio-with-javascript
      if (!this.beepOn)
        return; // Audio not supported
      if (this.beepPlaying)
        return;

      var beep = this.beep;
      if (!beep)
        return;

      this.beepPlaying = true;
      beep.play();
    }

  });

  return new WindowView();
});
