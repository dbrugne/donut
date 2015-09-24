/**
 * Module inspired by the no longer maintained
 * ttsvetko/HTML5-Desktop-Notifications
 *
 * source: https://github.com/ttsvetko/HTML5-Desktop-Notifications/
 *
 * /!\ Warning: Safari native methods required for Notifications do NOT run in
 * strict mode.
 */

var _ = require('underscore');

var PERMISSION_DEFAULT = 'default';
var PERMISSION_GRANTED = 'granted';
var PERMISSION_DENIED = 'denied';
var PERMISSION = [ PERMISSION_GRANTED, PERMISSION_DEFAULT, PERMISSION_DENIED ];
var defaultSetting = {
  pageVisibility: true, // always display, even if application is in background
  autoClose: 3000
};
var emptyString = '';

var isSupported = (function () {
  var isSupported = false;
  /*
   * Use try {} catch() {} because the check for IE may throws an exception
   * if the code is run on browser that is not Safari/Chrome/IE or
   * Firefox with html5notifications plugin.
   *
   * Also, we canNOT detect if msIsSiteMode method exists, as it is
   * a method of host object. In IE check for existing method of host
   * object returns undefined. So, we try to run it - if it runs
   * successfully - then it is IE9+, if not - an exceptions is thrown.
   */
  try {
    isSupported = !!(/* Safari, Chrome */window.Notification || /* Chrome & ff-html5notifications plugin */window.webkitNotifications || /* Firefox Mobile */navigator.mozNotification || /* IE9+ */(window.external && window.external.msIsSiteMode() !== undefined));
  } catch (e) {
  }
  return isSupported;
}());
var ieVerification = Math.floor((Math.random() * 10) + 1);

var settings = defaultSetting;

function getNotification (title, options) {
  var notification;
  if (window.Notification) { /* Safari 6, Chrome (23+) */
    notification = new window.Notification(title, {
      /* The notification's icon - For Chrome in Windows, Linux & Chrome OS */
      icon: _.isString(options.icon)
        ? options.icon
        : options.icon.x32,
      /* The notification’s subtitle. */
      body: options.body || emptyString,
      /*
       The notification’s unique identifier.
       This prevents duplicate entries from appearing if the user has multiple instances of your website open at once.
       */
      tag: options.tag || emptyString
    });
  } else if (window.webkitNotifications) { /* FF with html5Notifications plugin installed */
    notification = window.webkitNotifications.createNotification(options.icon, title, options.body);
    notification.show();
  } else if (navigator.mozNotification) { /* Firefox Mobile */
    notification = navigator.mozNotification.createNotification(title, options.body, options.icon);
    notification.show();
  } else if (window.external && window.external.msIsSiteMode()) { /* IE9+ */
    // Clear any previous notifications
    window.external.msSiteModeClearIconOverlay();
    window.external.msSiteModeSetIconOverlay((_.isString(options.icon)
      ? options.icon
      : options.icon.x16), title);
    window.external.msSiteModeActivate();
    notification = {
      'ieVerification': ieVerification + 1
    };
  }
  if (_.isFunction(options.onclick)) {
    notification.onclick = options.onclick;
  }
  if (_.isFunction(options.onclose)) {
    notification.onclose = options.onclose;
  }
  if (_.isFunction(options.ondisplay)) {
    if (window.Notification) {
      notification.onshow = options.ondisplay;
    } else {
      notification.ondisplay = options.ondisplay;
    }
  }
  if (_.isFunction(options.onerror)) {
    notification.onerror = options.onerror;
  }
  return notification;
}

function getWrapper (notification) {
  return {
    close: function () {
      if (notification) {
        if (notification.close) {
          // http://code.google.com/p/ff-html5notifications/issues/detail?id=58
          notification.close();
        } else if (notification.cancel) {
          notification.cancel();
        } else if (window.external && window.external.msIsSiteMode()) {
          if (notification.ieVerification === ieVerification) {
            window.external.msSiteModeClearIconOverlay();
          }
        }
      }
    }
  };
}

function requestPermission (callback) {
  if (permissionLevel() !== PERMISSION_DEFAULT) {
    return;
  }
  if (!isSupported) {
    return;
  }
  var callbackFunction = _.isFunction(callback)
    ? callback
    : _.noop;
  if (window.webkitNotifications && window.webkitNotifications.checkPermission) {
    /*
     * Chrome 23 supports window.Notification.requestPermission, but it
     * breaks the browsers, so use the old-webkit-prefixed
     * window.webkitNotifications.checkPermission instead.
     *
     * Firefox with html5notifications plugin supports this method
     * for requesting permissions.
     */
    window.webkitNotifications.requestPermission(callbackFunction);
  } else if (window.Notification && window.Notification.requestPermission) {
    window.Notification.requestPermission(callbackFunction);
  }
}

function permissionLevel () {
  var permission;
  if (!isSupported) {
    return;
  }
  if (window.Notification && window.Notification.permissionLevel) {
    // Safari 6
    permission = window.Notification.permissionLevel();
  } else if (window.webkitNotifications && window.webkitNotifications.checkPermission) {
    // Chrome & Firefox with html5-notifications plugin installed
    permission = PERMISSION[ window.webkitNotifications.checkPermission() ];
  } else if (window.Notification && window.Notification.permission) {
    // Firefox 23+
    permission = window.Notification.permission;
  } else if (navigator.mozNotification) {
    // Firefox Mobile
    permission = PERMISSION_GRANTED;
  } else if (window.external && (window.external.msIsSiteMode() !== undefined)) { /* keep last */
    // IE9+
    permission = window.external.msIsSiteMode()
      ? PERMISSION_GRANTED
      : PERMISSION_DEFAULT;
  }
  return permission;
}

function createNotification (title, options) {
  var notification;
  var notificationWrapper;
  /**
   * Return undefined if notifications are not supported.
   * Return undefined if no permissions for displaying notifications.
   * Title and icons are required. Return undefined if not set.
   */
  if (isSupported && _.isString(title) && (options &&
    (_.isString(options.icon) || _.isObject(options.icon))) &&
    (permissionLevel() === PERMISSION_GRANTED)) {
    notification = getNotification(title, options);
  }
  notificationWrapper = getWrapper(notification);
  // Auto-close notification
  if (settings.autoClose && notification && !notification.ieVerification && notification.addEventListener) {
    notification.addEventListener('show', function () {
      var notification = notificationWrapper;
      window.setTimeout(function () {
        notification.close();
      }, settings.autoClose);
    });
  }
  return notificationWrapper;
}

module.exports = {
  PERMISSION_DEFAULT: PERMISSION_DEFAULT,
  PERMISSION_GRANTED: PERMISSION_GRANTED,
  PERMISSION_DENIED: PERMISSION_DENIED,
  createNotification: createNotification,
  permissionLevel: permissionLevel,
  requestPermission: requestPermission
};
