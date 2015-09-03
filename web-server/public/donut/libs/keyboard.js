'use strict';
define([
  'underscore'
], function (_) {
  var keyboard = {
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
    END: 35
  };

  keyboard._getLastKeyCode = function () {
    var e = window.event || event;
    return {
      key: e.which,
      isShift: !!e.shiftKey,
      isCtrl: !!e.ctrlKey,
      isAlt: !!e.altKey,
      isMeta: !!e.metaKey
    };
  };

  return keyboard;
});
