require.config({
  paths: {
    'jquery'                      : '../vendor/jquery/dist/jquery',
    'bootstrap'                   : '../vendor/bootstrap/dist/js/bootstrap',
    'facebook'                    : '//connect.facebook.net/fr_FR/all',
    'jquery.talkative'            : '../vendor/talkative/jquery.talkative',
    'jquery.contactform'          : '../javascripts/plugins/jquery.contactform'
  },
  shim: {
    'bootstrap'          : ['jquery'],
    'facebook'           : { exports: 'FB' },
    'jquery.talkative'   : ['jquery'],
    'jquery.contactform' : ['jquery']
  }
});

require([
  'jquery',
  'facebook',
  'bootstrap',
  'jquery.talkative',
  'jquery.contactform'
], function ($, facebook) {

  // Landing text rotation
  if ($('#landing').length) {
    $('[data-toggle="talkative"]').talkative({
      start: 2000,
      delay: 5000,
      delay_animation: 900
    });
  }

  // User and room profiles
  if ($('#profile').length) {
  }

  // Language switcher
  $('#languages .switch').click(function(event) {
    var language = $(this).data('language');
    if (!language)
      return;

    var d = new Date();
    d.setTime(d.getTime() + (365*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = 'donut.lng' + "=" + language + "; " + expires;
    location.reload();
  });

  // Contact form
  $('[data-toggle="contactform"]').contactform({});

  // Facebook setup
  try {
    facebook.init({
      appId: window.facebook_app_id,
      version: 'v2.1',
      status: true,
      xfbml: true
    });
  } catch (e) {
    console.log(e);
    return false;
  }

});