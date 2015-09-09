require.config({
  paths: {
    '_translations': '../donut/translations',
    'jquery': '../vendor/jquery/dist/jquery',
    'underscore': '../vendor/underscore/underscore',
    'backbone': '../vendor/backbone/backbone',
    'bootstrap': '../vendor/bootstrap/dist/js/bootstrap',
    'text': '../vendor/requirejs-text/text',
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
  '_translations',
  'jquery',
  'underscore',
  'backbone',
  'common',
  'i18next',
  './search',
  'bootstrap',
  'jquery.talkative',
  'jquery.socialify',
  'jquery.contactform'
], function (translations, $, _, Backbone, common, i18next, SearchView) {

  var i18nextOptions = {
    cookieName: 'donut.lng',
    debug: false // @debug
  };
  // @doc: http://i18next.com/pages/doc_init.html#getresources
  if (_.isString(translations)) {
    i18nextOptions = _.extend({
      resGetPath: translations,
      dynamicLoad: true
    }, i18nextOptions);
  } else {
    i18nextOptions.resStore = translations;
  }
  i18next.init(i18nextOptions);
  // make i18next available from all underscore templates views (<%= t('key') %>)
  window.t = i18next.t; // @global

  // Intialize Talkative on all pages
  $('[data-toggle="talkative"]').talkative({
    start: 2000,
    delay: 5000,
    delay_animation: 900
  });

  // Contact form
  $('[data-toggle="contactform"]').contactform({});

  // Landing Page
  if ($('#landing').length) {
    var that = this;
    this.searchView = new SearchView({el: $('#landing .ctn-results .results .rooms')});
    var limit = 20; // default limit on landing page (1st load)

    var searchFunction = function (search, skip, replace) {
      $.ajax('https://donut.local/rest/search?limit=' + limit + '&skip=' + skip + '&q=' + search, {
        success: function (response) {
          that.searchView.render({
            rooms: (
              response.rooms && response.rooms.list ?
                response.rooms.list :
                []
            ),
            title: false,
            search: false,
            more: ( response.rooms && response.rooms.list && response.rooms.list.length == limit ?
                true :
                false
            ),
            replace: replace
          });
        }
      });
    };

    // Click load more button
    $('#landing').find('.load-more').click(function (e) {
      var search = $('#landing #search-field').val();
      var skip = $('#landing .ctn-results .results .rooms .list .room').length || 0;
      searchFunction(search, skip, false);
    });

    // click search button (responsive)
    $('#landing')
      .find('.searchbar .action-search').click(function (e) {
        var search = $('#landing .searchbar input').val();
        searchFunction(search, 0, true);
      });

    // submit form (search results) on non responsive
    $('#landing').find('.form-search').submit(function (e) {
      var search = $('#landing #search-field').val();
      e.preventDefault();
      searchFunction(search, 0, true);
    });

    // validate signup form
    $('form#signup').submit(function (e) {
      var $username = $('form#signup').find('#signin-username');
      var $email = $('form#signup').find('#signin-email');
      var $password = $('form#signup').find('#signin-password');

      $username.parents('.form-group').removeClass(function (index, css) {
        return (css.match(/(has-(success|error))+/g) || []).join(' ');
      });
      $email.parents('.form-group').removeClass(function (index, css) {
        return (css.match(/(has-(success|error))+/g) || []).join(' ');
      });
      $password.parents('.form-group').removeClass(function (index, css) {
        return (css.match(/(has-(success|error))+/g) || []).join(' ');
      });

      // Check validity of username
      if ($username.val() === '' || !common.validateUsername($username.val())) {
        $username.parents('.form-group').addClass('has-error');
        e.preventDefault();
      } else {
        $username.parents('.form-group').addClass('has-success');
      }

      // Check validity of email
      if ($email.val() === '' || !common.validateEmail($email.val())) {
        $email.parents('.form-group').addClass('has-error');
        e.preventDefault();
      } else {
        $email.parents('.form-group').addClass('has-success');
      }

      // Check validity of email
      if ($password.val() === '' || !common.validatePassword($password.val())) {
        $password.parents('.form-group').addClass('has-error');
        e.preventDefault();
      } else {
        $password.parents('.form-group').addClass('has-success');
      }

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

});
