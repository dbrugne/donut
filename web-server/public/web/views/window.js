var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
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
    this.listenTo(app, 'newEvent', this.onNewEvent);
    this.listenTo(app, 'setTitle', this.setTitle);
    this.listenTo(app, 'viewedEvent', this.renderTitle);

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
    this.listenTo(app.client, 'admin:exit', this.onAdminExit);
    this.listenTo(app.client, 'admin:reload', this.onAdminReload);
  },

  renderTitle: function () {
    var title = '';

    // determine if something 'new'
    var thereIsNew = app.rooms.some(function (d) { // first looks in rooms
      return d.get('unviewed');
    });
    if (!thereIsNew) {
      thereIsNew = app.ones.some(function (d) { // then looks in ones
        return d.get('unviewed');
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
    var model = app.getFocusedModel();
    if (model) {
      model.trigger('windowRefocused'); // mark visible as read for focused discussion when window recover its focus
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
    if (!app.client.isConnected()) {
      return;
    }

    // only if at least one discussion is open and preferences checked
    if ((!app.rooms || app.rooms.length < 1) && (!app.ones || app.ones.length < 1) && app.user.shouldDisplayExitPopin()) {
      return i18next.t('chat.closeapp');
    }

    if (app.user.shouldDisplayExitPopin()) {
      return i18next.t('chat.closemessage');
    }
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
   * New incoming event title, sound and badges
   ***************************************************/

  onNewEvent: function (type, data, model) {
    if (!data) {
      return;
    }

    // last event time
    model.set('last', Date.now());

    var collection = (model.get('type') === 'room')
      ? app.rooms
      : app.ones;

    // badge (even if focused), only if user sending the message is not current user
    if (model.get('unviewed') !== true && app.user.get('user_id') !== data.user_id) {
      model.set('unviewed', true);
      model.set('first_unviewed', data.id);
    }

    // update navigation
    collection.sort();
    if (model.get('type') === 'room') {
      app.trigger('redrawNavigationRooms');
    } else {
      app.trigger('redrawNavigationOnes');
    }
    app.trigger('unviewedEvent');

    // ignore event from current user
    if (app.user.get('user_id') === data.user_id) {
      return;
    }

    // if current discussion is focused do nothing more
    if (this.focused && model.get('focused')) {
      return;
    }

    // play sound
    this.play();

    // blink title
    this.renderTitle();

    // if current window is focused do nothing more
    if (this.focused) {
      return;
    }

    // desktop notification
    var key = (model.get('type') === 'room')
      ? 'room:' + model.get('id')
      : 'one:' + model.get('id');
    var last = this.desktopNotificationsLimiters[key];
    if (last && (Date.now() - last) <= 60 * 1000) { // 1mn
      return;
    }

    if (type !== 'room:message' && type !== 'user:message') {
      return;
    }

    var title;
    if (type === 'room:message') {
      title = i18next.t('chat.notifications.messages.roommessage', {
        name: model.get('identifier'),
        message: data.message ? common.markup.toText(data.message) : ''
      });
    } else {
      title = i18next.t('chat.notifications.messages.usermessage', {
        username: data.username,
        message: data.message ? common.markup.toText(data.message) : ''
      });
    }
    if (!title) {
      return;
    }
    title = title.replace(/<\/*span>/g, '');
    this.desktopNotify(title, '');
    this.desktopNotificationsLimiters[key] = Date.now();
  },
  play: function () {
    if (!app.user.shouldPlaySound()) {
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
    if (!force && !app.user.shouldDisplayDesktopNotif()) {
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
