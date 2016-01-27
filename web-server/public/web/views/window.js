var $ = require('jquery');
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

  initialize: function (options) {
    this.listenTo(app, 'playSoundForce', this._play);
    this.listenTo(app, 'newEvent', this.onNewEvent);
    this.listenTo(app, 'setTitle', this.setTitle);

    this.$window = $(window);

    this.defaultTitle = document.title; // save original title on page load

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

  renderTitle: function (action) {
    var title = '';
    if (action === 'newEvent') {
      title += i18next.t('chat.unread.title') + ' ';
    }
    title += this.defaultTitle;

    if (this.title && this.title.length) {
      title += ' | ' + this.title;
    }
    document.title = title;

    if (action !== 'newEvent') {
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

    // if current window is focused do nothing more
    if (this.focused) {
      return;
    }

    // blink title
    this.renderTitle('newEvent');

    // desktop notification
    if (!app.user.shouldDisplayDesktopNotif()) {
      return;
    }
    if (type !== 'room:message' && type !== 'user:message') {
      return;
    }

    var title;
    if (type === 'room:message') {
      title = i18next.t('chat.notifications.messages.roommessage', {
        name: model.get('identifier'),
        username: (data.by_username) ? data.by_username : data.username
      });
    } else {
      title = i18next.t('chat.notifications.messages.usermessage', {
        username: data.username
      });
    }
    if (!title) {
      return;
    } else {
      title = title.replace(/<\/*span>/g, '').replace(/<br>/g, '');
    }

    var msg = (data.message)
      ? common.markup.toText(data.message)
      : '';
    if (msg) {
      msg = msg.replace(/<\/*span>/g, '').replace(/<br>/g, '');
    }

    var uri;
    if (model.get('type') === 'room') {
      uri = model.get('identifier');
    } else {
      uri = '#u/' + model.get('username').toLowerCase();
    }

    desktop.notify(model.get('id'), title, msg, uri);
  },
  play: function () {
    if (!app.user.shouldPlaySound()) {
      return;
    }

    // @source: http://stackoverflow.com/questions/9419263/playing-audio-with-javascript
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
  }
});

module.exports = new WindowView();
