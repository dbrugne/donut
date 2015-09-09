require.config({
  paths: {
    'jquery': '../vendor/jquery/dist/jquery',
    'underscore': '../vendor/underscore/underscore',
    'bootstrap': '../vendor/bootstrap/dist/js/bootstrap',
    'jquery.talkative': '../vendor/talkative/jquery.talkative',
    'jquery.socialify': '../javascripts/plugins/jquery.socialify',
    'jquery.contactform': '../javascripts/plugins/jquery.contactform',
    'i18next': '../vendor/i18next/i18next.amd.withJQuery',
    'common': '../vendor/donut-common/index'
  },
  shim: {
    'bootstrap': ['jquery'],
    'jquery.talkative': ['jquery'],
    'jquery.socialify': ['jquery'],
    'jquery.contactform': ['jquery']
  }
});

require([
  'jquery',
  'underscore',
  'common',
  'i18next',
  'bootstrap',
  'jquery.talkative',
  'jquery.socialify',
  'jquery.contactform'
], function ($, _, common, i18next) {

  // Landing text rotation
  if ($('#landing').length) {
    $('[data-toggle="talkative"]').talkative({
      start: 2000,
      delay: 5000,
      delay_animation: 900
    });
  }

  // User and room profiles
  if ($('.body-profile').length) {
    $('.body-profile').find('.share .facebook').click(function () {
      $.socialify.facebook({
        url: $(this).data('url'),
        name: i18next.t('chat.share.title', {name: $(this).data('name')}),
        picture: common.cloudinarySize($(this).data('avatar'), 350),
        description: i18next.t('chat.share.description', {name: $(this).data('name')})
      });
    });
    $('.body-profile').find('.share .twitter').click(function () {
      $.socialify.twitter({
        url: $(this).data('url'),
        text: $.t('chat.share.description', {name: $(this).data('name')})
      });
    });
    $('.body-profile').find('.share .googleplus').click(function () {
      $.socialify.google({
        url: $(this).data('url')
      });
    });

    $('.body-profile').find('[data-toggle="tooltip"]').tooltip();
  }

  // Language switcher
  $('#languages .switch').click(function (event) {
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

  // Contact form
  $('[data-toggle="contactform"]').contactform({});

});
