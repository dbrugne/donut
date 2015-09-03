'use strict';
define([
  'jquery'
], function ($) {
  return {
    BACKSPACE: 8,
    TAB: 9,
    RETURN: 13,
    ESC: 27,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    COMMA: 188,
    SPACE: 32,
    HOME: 36,
    END: 35,
    _getLastKeyCode: function () {
      if (window.event) {
        return {
          key: window.event.keyCode,
          isShift: !!window.event.shiftKey,
          isCtrl: !!window.event.ctrlKey,
          isAlt: !!window.event.altKey,
          isMeta: !!window.event.metaKey
        };
      } else {
        return {
          key: event.which,
          isShift: !!event.shiftKey,
          isCtrl: !!event.ctrlKey,
          isAlt: !!event.altKey,
          isMeta: !!event.metaKey
        };
      }
    }
  };
});
