(function ($) {
  'use strict';

  // @source https://raw.githubusercontent.com/itlessons/jquery-emotions/master/jquery.emotions.js

  $.smilify = function (text) {
    return $.smilify.parse(text);
  };

  $.smilifyHtmlList = function () {
    var html = '<div class="smileys">';
    var i = 0;
    $.each($.smilify.settings.map, function (key, value) {
      i++;
      html += $.smilify.settings.replacement.replace(/\{eId\}/g, value);
      if (i >= 6) {
        html += '<br />';
        i = 0;
      }
    });
    html += '</div>';
    return html;
  };

  $.smilifyGetSymbolFromCode = function (code) {
    if (!code) {
      return '';
    }

    var symbol = '';
    $.each($.smilify.settings.map, function (key, value) {
      if (value === code) {
        symbol = key;
        return false;
      }
    });
    return symbol;
  };

  var $t = $.smilify;

  $.extend($.smilify, {

    settings: {
      replacement: '<span class="smilify smilify-{eId}" data-smilify-code="{eId}" title="{eId}"></span>',
      map: {
        ':)': 'smile',
        ':(': 'frown',
        ':D': 'grin',
        'xD': 'lol',
        ';)': 'wink',
        'X(': 'angry',
        ':\'(': 'tears',
        ':o': 'surprised',
        '<:)': 'party',
        ':P': 'cheeky',
        ':$': 'blush',
        'I-)': 'snore',
        '8-)': 'cool',
        ':S?': 'confused',
        ':§': 'puke',
        '*rofl*': 'rofl',
        '3:)': 'devil',
        'O:)': 'angel',
        '*up*': 'up',
        '*down*': 'down',
        '*clap*': 'clap',
        '*I5*': 'highfive',
        '<3': 'heart',
        '</3': 'brokenheart',
        ':*': 'kiss',
        '<*>': 'star',
        '*$*': 'dollar',
        '@>--': 'rose',
        '*teddy*': 'teddy',
        '(o)': 'donut'
      }
    },
    shortcode: function (eId) {
      for (var pattern in this.settings.map) {
        if (this.settings.map[pattern] === eId) {
          return pattern;
        }
      }
      return '';
    },
    parse: function (text) {

      text = text || '';

      for (var pattern in this.settings.map) {
        if (pattern === ':)') {
          continue;
        }
        text = this.analyse(pattern, text);
      }

      // :) should be last to not collision with longer pattern like >:)
      text = this.analyse(':)', text);

      return text;
    },
    analyse: function (pattern, text) {
      var encPattent = $t.encode(pattern);

      if (text.indexOf(pattern) < 0 && text.indexOf(encPattent) < 0) {
        return text;
      }

      var rep = this.settings.replacement
        .replace(/\{eId\}/g, this.settings.map[pattern]);

      text = text
        .replace(new RegExp($t.quote(pattern), 'g'), rep)
        .replace(new RegExp($t.quote(encPattent), 'g'), rep);

      return text;
    },
    encode: function (str) {
      return (str + '')
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
    quote: function (str) {
      return (str + '').replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
    }
  });

  $.fn.smilify = function () {
    var action;
    if (arguments.length >= 1 && typeof arguments[0] === 'string') {
      action = arguments[0];
    } else {
      action = 'smilify';
    }

    // smilify codes
    if (action === 'smilify') {
      this.each(function () {
        var el = $(this);
        el.html($.smilify(el.html()));
      });
    }

    return this;
  };
})(window.jQuery);
