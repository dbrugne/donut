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

keyboard.getLastKeyCode = function (event) {
  var e = event || window.event;
  return {
    key: e.which,
    isShift: !!e.shiftKey,
    isCtrl: !!e.ctrlKey,
    isAlt: !!e.altKey,
    isMeta: !!e.metaKey
  };
};

module.exports = keyboard;
