var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var rooms = require('../collections/rooms');
var onetoones = require('../collections/onetoones');
var desktop = require('../libs/desktop');

var WindowView = Backbone.View.extend({
  focused: true,

  defaultTitle: '',

  title: '',

  titleBlinker: '',

  preventPopin: false,

  beep: '',
  beepPlaying: false,
  beepOn: false,

  desktopNotificationsLimiters: null,

  initialize: function (options) {
    this.listenTo(app, 'desktopNotification', this.desktopNotify);
    this.listenTo(app, 'playSoundForce', this._play);
    this.listenTo(app, 'unviewedInOut', this.triggerInout);
    this.listenTo(app, 'unviewedMessage', this.triggerMessage);
    this.listenTo(app, 'setTitle', this.setTitle);

    this.$window = $(window);

    this.defaultTitle = document.title; // save original title on page load

    this.desktopNotificationsLimiters = {};

    // Load audio elements
    var that = this;
    if (typeof window.Audio !== 'undefined') {
      this.beepOn = true;
      var cb = function () {
        that.beepPlaying = false;
      };
      this.beep = new window.Audio('/sounds/beep.mp3');
      this.beep.onended = cb;
    }

    // Bind events to browser window
    this.$window.focus(function (event) {
      that.onFocus();
    });
    this.$window.blur(function (event) {
      that.onBlur();
    });
    this.$window.on('beforeunload', function () {
      return that.onClose();
    });

    // Bind events to model
    this.listenTo(client, 'admin:exit', this.onAdminExit);
    this.listenTo(client, 'admin:reload', this.onAdminReload);
  },

  renderTitle: function () {
    var title = '';

    // determine if something 'new'
    var thereIsNew = rooms.some(function (d) { // first looks in rooms
      return d.isThereNew();
    });
    if (!thereIsNew) {
      thereIsNew = onetoones.some(function (d) { // then looks in onetoones
        return d.isThereNew();
      });
    }

    if (thereIsNew) {
      title += i18next.t('chat.unread.title') + ' ';
    }
    title += this.defaultTitle;

    if (this.title && this.title.length) {
      title += ' | ' + this.title;
    }
    document.title = title;

    if (!thereIsNew) {
      clearInterval(this.titleBlinker);
      return;
    }
    // now make it blink
    var odd = title;
    var even = this.defaultTitle;
    clearInterval(this.titleBlinker);
    this.titleBlinker = setInterval(function () {
      document.title = (document.title === odd) ? even : odd;
    }, 1000);
  },

  setTitle: function (title) {
    this.title = title;
    this.renderTitle();
  },

  onBlur: function () {
    this.focused = false;
  },
  onFocus: function () {
    this.focused = true;

    // on window refocus execute some logic on current focused model
    var model = this._getFocusedModel();
    if (model) {
      model.trigger('windowRefocused'); // mark visible as read for focused discussion when window recover its focus
      model.resetNew();
    }

    // reset limiters
    this.desktopNotificationsLimiters = {};

    this.renderTitle();
  },
  onClose: function () {
    // sometimes we prevent exit popin
    if (this.preventPopin) {
      return;
    }

    // only if connected
    if (!client.isConnected()) {
      return;
    }

    // only if at least one discussion is open and preferences checked
    if ((!rooms || rooms.length < 1) && (!onetoones || onetoones.length < 1) && currentUser.shouldDisplayExitPopin()) {
      return i18next.t('chat.closeapp');
    }

    if (currentUser.shouldDisplayExitPopin()) {
      return i18next.t('chat.closemessage');
    }
  },

  _getFocusedModel: function () {
    var model = rooms.findWhere({focused: true});
    if (!model) {
      model = onetoones.findWhere({focused: true});
    }

    return model; // could be 'undefined'
  },

  /** *************************************************
   * Admin events
   ***************************************************/
  onAdminExit: function () {
    this.preventPopin = true;
    window.location.assign('/');
  },
  onAdminReload: function () {
    this.preventPopin = true;
    window.location.reload();
  },

  /** *************************************************
   * Notifications
   ***************************************************/

  triggerInout: function (event, model) {
    if (event.get('type') !== 'room:in') {
      return;
    }

    // test if not from me (currentUser)
    if (event.get('data').username === currentUser.get('username')) {
      return;
    }

    // test if i'm owner or op
    if (!model.currentUserIsOwner() && !model.currentUserIsOp()) {
      return;
    }

    // play sound (even if discussion/window is focused or not)
    this.play();

    // test if current discussion is focused
    var isFocused = (this.focused && model.get('focused'));

    // badge and title only if discussion is not focused
    if (!isFocused) {
      model.set('newuser', true); // will trigger tab badge and title when rendering

      // update tabs
      app.trigger('redraw-block');

      // update title
      this.renderTitle();
    }
  },
  triggerMessage: function (event, model) {
    if (event.getGenericType() !== 'message' && event.get('type') !== 'room:topic') {
      return;
    }

    // test if not from me (currentUser)
    if (event.get('data').username === currentUser.get('username')) {
      return;
    }

    // test if current discussion is focused
    var isFocused = (this.focused && model.get('focused'));

    // play sound (could be played for current focused discussion, but not for my own messages)
    // badge and title only if discussion is not focused
    if (!isFocused) {
      // test if is mentioned (only for rooms)
      var isMention = (event.getGenericType() !== 'message' && model.get('type') === 'room' && common.markup.isUserMentionned(currentUser.get('user_id'), event.get('data').message));
      this.play(); // only if not focused

      if (!isMention) {
        model.set('unviewed', true); // will trigger tab badge and title when rendering
      } else {
        model.set('newmention', true);
      }

      // update tabs and update title
      app.trigger('refreshRoomsList');
      this.renderTitle();
    }

    // desktop notification (only for one to one and if windows is not focused
    if (!this.focused) {
      if (model.get('type') === 'onetoone') {
        var data = event.get('data');
        if (data) {
          var key = 'usermessage:' + model.get('username');
          var last = this.desktopNotificationsLimiters[key];
          if (last && (Date.now() - last) <= 1 * 60 * 1000) {// 1mn
            return;
          }

          var message = data.message || '';
          var title = i18next.t('chat.notifications.messages.usermessage', {
            username: data.from_username,
            message: common.markup.toText(message)
          });
          this.desktopNotify(title.replace(/<\/*span>/g, ''), '');
          this.desktopNotificationsLimiters[key] = Date.now();
        }
      }
    }
  },
  play: function () {
    if (!currentUser.shouldPlaySound()) {
      return;
    }

    // @source: // http://stackoverflow.com/questions/9419263/playing-audio-with-javascript
    if (!this.beepOn) {
      return; // Audio not supported
    }
    if (this.beepPlaying) {
      return;
    }

    this.beepPlaying = true;
    this._play();
  },
  _play: function () {
    var beep = this.beep;
    if (!beep) {
      return;
    }
    beep.play();
  },
  desktopNotify: function (title, body, force) {
    if (!force && !currentUser.shouldDisplayDesktopNotif()) {
      return;
    }

    // Not already accepted or denied notification permission, prompt popup
    if (desktop.permissionLevel() === desktop.PERMISSION_DEFAULT) {
      desktop.requestPermission(_.bind(function () {
        desktop.createNotification(title, {
          body: body,
          icon: {
            'x16': 'images/donut_16x16.ico',
            'x32': 'images/donut_32x32.ico'
          }
        });
      }, this));
      return;
    }

    // User denied it
    if (desktop.permissionLevel() === desktop.PERMISSION_DENIED) {
      return;
    }

    desktop.createNotification(title, {
      body: body,
      icon: {
        'x16': 'images/donut_16x16.ico',
        'x32': 'images/donut_32x32.ico'
      }
    });
  }
});

module.exports = new WindowView();
