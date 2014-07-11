(function( $ ) {

  var debug = false;
  function d() {
    if (!debug) return;
    console.log.apply(console, arguments);
  }
  /**
   * Look for element with 'data-colorify' micro-data and search for children with
   * following micro-data:
   *
   *   - data-colorify-background='': apply on background color
   *   - data-colorify-text='': apply on text color
   *   - data-colorify-border='': apply border color
   *
   * Then apply one of the following action code:
   *   - color: apply initial color in 'data-colorify' micro-data
   *   - contrast: return white or black color code depending current color
   *        initial color brightness
   *   - lighter and darker: return lighter or darker version of initial color
   *   - smart: return lighter and darker version of initial color depending on
   *        initial color brightness
   *   - #ffffff (any hex color): return a version of initial color that are
   *       enough far to have a correct contrast.
   *       Could be lighter or darker but the two color are enough different to
   *       be printed together as text and background for example)
   *
   * <div data-colorify="#FF0EB1">
   *   <h1 data-text="color">My title</h1>
   *   <div data-colorify-background="color" data-text="contrast">
   *     My text
   *   </div>
   * </div>
   */

  var defaultColor = '#ffffff';
  var darkerFactor = -0.2;
  var lighterFactor = 0.2;
  var luminancePonderation = 71;
  var hexShortRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  var hexLongRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

  var whiteBrightness = getBrightness(hexToRgb('#ffffff')); // 255
  var blackBrightness = getBrightness(hexToRgb('#000000')); // 0
  var mediane = ((whiteBrightness - blackBrightness) / 2) + blackBrightness + luminancePonderation; // 129.5 + luminancePonderation
  var minimalStepOfContrast = ((whiteBrightness - blackBrightness) / 4) - 0.000009; // ~127.49999999999999, to avoid round problem: -0.000009

  function validateHex(hex) {
    if (!hex)
      return false;

    if (hexShortRegex.test(hex))
      return true;

    if (hexLongRegex.test(hex))
      return true;

    return false;
  }

  // source: http://stackoverflow.com/a/5624139/2028380
  function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    hex = hex.replace(hexShortRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = hexLongRegex.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // source: http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color#24213274
  function getBrightness(rgb) {
    var s = 0.299 * Math.pow(rgb.r,2) + 0.587 * Math.pow(rgb.g, 2) + 0.114 * Math.pow(rgb.b, 2);
    return Math.sqrt(s);
  }

  function getContrast(hex) {
    var brightness = getBrightness(hexToRgb(hex));
    d('contrast for '+hex+', brightness '+brightness+' <=> '+mediane);
    return (brightness > mediane)
      ? '#000000' // black
      : '#ffffff';  // white
  }

  // source: http://www.sitepoint.com/javascript-generate-lighter-darker-color/
  function applyLuminance(hex, lum) {
    lum = lum || 0;
    var rgb = hexToRgb(hex);
    var out = '';

    // convert to decimal and change luminosity
    for (var n in rgb) {
      r = Math.round(Math.min(Math.max(0, rgb[n] + (rgb[n] * lum)), 255)).toString(16);
      out += ("00"+r).substr(r.length);
    }

    return '#'+out;
  }

  // return a lighter color if color is dark or .. vice versa
  function getSmartColor(hex) {
    var brightness = getBrightness(hexToRgb(hex));
    return (brightness < mediane)
      ? applyLuminance(hex, darkerFactor)
      : applyLuminance(hex, lighterFactor)
  }

  // return a lighter or darker color depending on a second color
  function getResponsiveColor(text, background) {
    var textRgb = hexToRgb(text);
    var backgroundRgb = hexToRgb(background);
    var textBrightness = getBrightness(textRgb);
    var backgroundBrightness = getBrightness(backgroundRgb);

    d('text vs. fond: '+textBrightness+' vs. '+backgroundBrightness);

    var lum = function() {
      var distance = textBrightness - backgroundBrightness;
      d('distance: '+distance);
      if ( (distance >= 0 && distance >= minimalStepOfContrast)
      || (distance < 0 && distance <= (minimalStepOfContrast*-1)) ) {
        // distance is already sufficient
        d('distance is already sufficient');
        return 0;
      }
      d('distance not sufficient: '+distance);

      // simple addition in the same direction
      var step = (textBrightness > backgroundBrightness)
        ? minimalStepOfContrast
        : minimalStepOfContrast*-1;
      var newBrightness = textBrightness + step;
      d('adding '+step+' to '+textBrightness+' = newBrightness: '+newBrightness);
      distance = newBrightness - backgroundBrightness;
      d('distance: '+distance);
      if ( (distance >= 0 && distance >= minimalStepOfContrast)
        || (distance < 0 && distance <= (minimalStepOfContrast*-1)) ) {
        d('we return: '+step/255);
        return step/255;
      }
      d('distance still not sufficient: '+distance);

      // addition in other direction
      step = (textBrightness > backgroundBrightness)
        ? minimalStepOfContrast*-1
        : minimalStepOfContrast;
      newBrightness = textBrightness + step;
      d('adding '+step+' to '+textBrightness+' = newBrightness: '+newBrightness);
      distance = newBrightness - backgroundBrightness;
      d('distance: '+distance);
      if ( (distance >= 0 && distance >= minimalStepOfContrast)
        || (distance < 0 && distance <= minimalStepOfContrast*-1)) {
        d('we return: '+step/255);
        return step/255;
      }
      d('distance still not sufficient: '+distance +' (!!!!!!!)');
      return 0;
    }();

    d('new brightness: '+lum);
    return applyLuminance(text, lum);
  }

  $.fn.colorify = function() {

    this.find('[data-colorify]').each(function() {
      var color = $(this).attr('data-colorify')

      if (!color || !validateHex(color))
        color = defaultColor;

      var scheme = {
        color: color,
        contrast: getContrast(color),
        darker: applyLuminance(color, darkerFactor),
        lighter: applyLuminance(color, lighterFactor),
        smart: getSmartColor(color)
      };

      function process(index) {
        var $subElement = $(this);
        var actionText = $subElement.attr('data-colorify-text');
        var actionBackground = $subElement.attr('data-colorify-background');
        var actionBorder = $subElement.attr('data-colorify-border');

        // text
        if (actionText)
          if (scheme[actionText])
            $subElement.css('color', scheme[actionText]);
          else if (validateHex(actionText))
            $subElement.css('color', getResponsiveColor(scheme.color, actionText));

        // background
        if (actionBackground)
          if (scheme[actionBackground])
            $subElement.css('background-color', scheme[actionBackground]);
          else if (validateHex(actionBackground))
            $subElement.css('background-color', getResponsiveColor(scheme.color, actionBackground));

        // border
        if (actionBorder)
          if (scheme[actionBorder])
            $subElement.css('border-color', scheme[actionBorder]);
          else if (validateHex(actionBorder))
            $subElement.css('border-color', getResponsiveColor(scheme.color, actionBorder));

      }

      var $element = $(this);
      process.apply(this);
      $element.find(
        '[data-colorify-text], [data-colorify-background], [data-colorify-border]'
      ).each(process);

    });

    return this;

  };

}( jQuery ));