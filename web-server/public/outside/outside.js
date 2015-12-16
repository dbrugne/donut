var $ = require('jquery');
global.jQuery = $; // expose jQuery globally, needed for some beside plugins
require('bootstrap/js/transition');
require('bootstrap/js/dropdown');
require('bootstrap/js/modal');
require('bootstrap/js/tooltip');
require('bootstrap/js/popover');
require('bootstrap/js/collapse');
require('../javascripts/jquery.socialify');
require('../javascripts/jquery.contactform');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');

// Contact form
$('[data-toggle="contactform"]').contactform({});

// Landing Page
var $landing = $('#landing');
if ($landing.length) {
  $(window).scroll(function () {
    if ($(this).scrollTop() > 700) {
      $landing.addClass('clean');
    } else {
      $landing.removeClass('clean');
    }
  });
}

// User and room profiles
var $bodyProfile = $('.body-profile');
if ($bodyProfile.length) {
  $bodyProfile.find('.share .facebook').click(function () {
    $.socialify.facebook({
      url: $(this).data('url'),
      name: i18next.t('chat.share.title', {name: $(this).data('name')}),
      picture: common.cloudinary.prepare($(this).data('avatar'), 350),
      description: i18next.t('chat.share.description', {name: $(this).data('name')})
    });
  });
  $bodyProfile.find('.share .twitter').click(function () {
    $.socialify.twitter({
      url: $(this).data('url'),
      text: i18next.t('chat.share.description', {name: $(this).data('name')})
    });
  });
  $bodyProfile.find('.share .googleplus').click(function () {
    $.socialify.google({
      url: $(this).data('url')
    });
  });

  $bodyProfile.find('[data-toggle="tooltip"]').tooltip({
    container: 'body'
  });
}

// Language switcher
$('.switch[data-language]').click(function (event) {
  var language = $(this).data('language');
  if (!language) {
    return;
  }

  var d = new Date();
  d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
  var expires = 'expires=' + d.toUTCString();
  document.cookie = 'donut.lng' + '=' + language + '; ' + expires;
  window.location.reload();
});
