"use strict";
/**
 * @source https://raw.githubusercontent.com/itlessons/jquery-emotions/master/jquery.emotions.js
 */
(function ($) {

  $.smilify = function (text) {
    return $.smilify.parse(text);
  };

  var $t = $.smilify;

  $.extend($.smilify, {

    settings: {
      replacement: '<span class="smilify smilify-{eId}" data-smilify-code="{eId}"></span>',
      map: {
        ":D": "grin",
        ":')": "joy",
        ";)": "wink",
        ":P": "cheeky",
        ":O": "surprised",
        ":*": "kiss",
        ":(": "frown",
        ":'(": "tears",
        ">B)": "cool",
        ":@": "angry",
        ":S": "confused",
        "O:)": "angel",
        "3:)": "devil",
        "(8)": "music",
        "(Y)": "thumbs-up",
        "(N)": "thumbs-down",
        "<3": "heart",
        "</3": "broken-heart",
        ":)": "smile" // should be last to not collision with longer pattern like >:)
      }
    },
    shortcode: function(eId){
      var $s = $t.settings;
      for (var pattern in $s.map) {
        if($s.map[pattern] == eId)
          return pattern;
      }

      return "";
    },
    parse: function (text) {

      text = text || '';

      var $s = $t.settings;

      for (var pattern in $s.map) {

        var encPattent = $t.encode(pattern);

        if (text.indexOf(pattern) < 0 && text.indexOf(encPattent) < 0) {
          continue;
        }

        var rep = $s.replacement
          .replace(/\{eId\}/g, $s.map[pattern]);

        text = text
          .replace(new RegExp($t.quote(pattern), "g"), rep)
          .replace(new RegExp($t.quote(encPattent), "g"), rep);
      }

      return text;
    },
    encode: function (str) {
      return (str + '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
    quote: function (str) {
      return (str + '').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    }
  });

  $.fn.smilify = function () {
    var action;
    if (arguments.length >= 1 && typeof arguments[0] == 'string')
      action = arguments[0];
    else
      action = 'smilify';

    // symbol
    if (action == 'symbol') {
      var symbol = '';
      var search = arguments[1];
      $.each($.smilify.settings.map, function(key, value) {
        if (value == search) symbol = key;
      });
      return symbol;
    }

    // list
    if (action == 'list') {
      this.each(function () {
        var el = $(this);
        var text = '';
        $.each($.smilify.settings.map, function(key, value) {
          text += " "+key;
        });
        el.text(text);
      });
    }

    // smilify codes
    if (action == 'smilify') {
      this.each(function () {
        var el = $(this);
        el.html($.smilify(el.html()));
      });
    }

    // html
    if (action == 'html') {
      var code = arguments[1];
      return $.smilify.settings.replacement.replace(/\{eId\}/g, code);
    }

    return this;
  };
})(jQuery);