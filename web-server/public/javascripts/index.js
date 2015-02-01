require.config({
  paths: {
    'jquery'                      : '../vendor/jquery/jquery',
    'bootstrap'                   : '../vendor/bootstrap/dist/js/bootstrap',
    'facebook'                    : '//connect.facebook.net/fr_FR/all',
    'jquery.linkify'              : '../javascripts/plugins/jquery.linkify',
    'jquery.talkative'            : '../vendor/talkative/jquery.talkative'
  },
  shim: {
    'bootstrap'        : ['jquery'],
    'facebook' : {
      exports: 'FB'
    },
    'jquery.linkify'   : ['jquery'],
    'jquery.talkative' : ['jquery']
  }
});

require([
  'jquery',
  'facebook',
  'bootstrap',
  'jquery.linkify',
  'jquery.talkative'
], function ($, facebook) {

  // Landing text rotation
  if ($('#landing').length) {
    $('[data-toggle="talkative"]').talkative({
      start: 2000,
      delay: 4000
    });
  }

  // User and room profiles
  if ($('#profile').length) {
    $('.website').linkify();
    $('.users .website .linkified').each(function() {
      var text = this.innerText;
      if (text.indexOf('://') === -1)
        return;

      text = text.replace(/.*?:\/\//g, "");

      if (text.length > 30)
        text = text.substr(0, 27) + '...';

      this.innerText = text;
    });
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