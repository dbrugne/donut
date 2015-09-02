(function () {
  'use strict';
  var $buoop = {
    vs: { i: 10, f: 15, o: 12.1, s: 5.1 },
    reminder: 6,
    newwindow: true
  };
  $buoop.ol = window.onload;
  window.onload = function () {
    try {
      if ($buoop.ol) {
        $buoop.ol();
      }
    } catch (e) {}
    var e = document.createElement('script');
    e.setAttribute('type', 'text/javascript');
    e.setAttribute('src', '//browser-update.org/update.js');
    document.body.appendChild(e);
  };
})();
