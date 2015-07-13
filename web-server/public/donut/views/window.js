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

    desktopNotificationsLimiters: function() {},

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
      this.listenTo(client, 'admin:exit', this.onAdminExit);
      this.listenTo(client, 'admin:reload', this.onAdminReload);
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

      // reset limiters
      this.desktopNotificationsLimiters = {};

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

    /***************************************************
     * Admin events
     ***************************************************/
    onAdminExit: function() {
      this.preventPopin = true;
      window.location.assign('/');
    },
    onAdminReload: function() {
      this.preventPopin = true;
      window.location.reload();
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

      // desktop notification (only for one to one and if windows is not focused
      if (!this.focused) {
        if (model.get('type') == 'onetoone') {
          var data = event.get('data');
          if (data) {
            var key = 'usermessage:'+model.get('username');
            var last = this.desktopNotificationsLimiters[key];
            if (last && (Date.now() - last) <= 1*60*1000) // 1mn
              return;

            var title = $.t('chat.notifications.desktop.usermessage', { username: data.from_username });
            var message = data.message || '';
            this.desktopNotify(title, message);
            this.desktopNotificationsLimiters[key] = Date.now();
          }
        }
      }
    },
    play: function() {
      if (!currentUser.shouldPlaySound())
        return;

      // @source: // http://stackoverflow.com/questions/9419263/playing-audio-with-javascript
      if (!this.beepOn)
        return; // Audio not supported
      if (this.beepPlaying)
        return;

      this.beepPlaying = true;
      this._play();
    },
    _play: function() {
      var beep = this.beep;
      if (!beep)
        return;
      beep.play();
    },
    desktopNotify: function(title, body) {
      if (!currentUser.shouldDisplayDesktopNotif())
        return;

      this._desktopNotify(title, body);
    },
    _desktopNotify: function(title, body) {
      // Not already accepted or denied notification permission, prompt popup
      if (notify.permissionLevel() == notify.PERMISSION_DEFAULT)
        return this._desktopNotifyRequestPermission(notify.permissionLevel(), notify.PERMISSION_GRANTED, this._desktopNotifyCreateNotification());

      // User denied it
      if (notify.permissionLevel() == notify.PERMISSION_DENIED)
        return;

      this._desktopNotifyCreateNotification(title, body);
    },
    _desktopNotifyCreateNotification: function(title, body) {
      notify.createNotification( title, {
        body: body,
        icon: {
          'x16': 'images/donut_16x16.ico',
          'x32': 'images/donut_32x32.ico'
        }
      });
    },
    _desktopNotifyRequestPermission: function(permissionLevel, permissionsGranted) {
      var statusClass = {};
      statusClass[notify.PERMISSION_DEFAULT] = 'alert';
      statusClass[notify.PERMISSION_GRANTED] = 'alert alert-success';
      statusClass[notify.PERMISSION_DENIED] = 'alert alert-error';

      var win = window;
      var isIE = false;

      try {
        isIE = (win.external && win.external.msIsSiteMode() !== undefined);
      } catch (e) {}

      var messages = {
        notPinned: 'Pin current page in the taskbar in order to receive notifications',
        notSupported: '<strong>Desktop Notifications not supported!</strong> Check supported browsers table and project\'s GitHub page.'
      };

      messages[notify.PERMISSION_DEFAULT] = '<strong>Warning!</strong> Click to allow displaying desktop notifications.';
      messages[notify.PERMISSION_GRANTED] = '<strong>Success!</strong>';
      messages[notify.PERMISSION_DENIED] = '<strong>Denied!</strong>';

      var isSupported = notify.isSupported;
      var status = isSupported ? statusClass[permissionLevel] : statusClass[notify.PERMISSION_DENIED];
      var message = isSupported ? (isIE ? messages.notPinned : messages[permissionLevel]) : messages.notSupported;

      if (permissionLevel === notify.PERMISSION_DEFAULT) {
        notify.requestPermission(function() {
          permissionLevel = notify.permissionLevel();
          permissionsGranted = (permissionLevel === notify.PERMISSION_GRANTED);
          status = isSupported ? statusClass[permissionLevel] : statusClass[notify.PERMISSION_DENIED];
          message = isSupported ? (isIE ? messages.notPinned : messages[permissionLevel]) : messages.notSupported;
        });
      }
    }
  });

  return new WindowView();
});
