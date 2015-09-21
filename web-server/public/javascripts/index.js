require.config({
  paths: {
    '_translations': '../donut/translations',
    'jquery': '../vendor/jquery/dist/jquery',
    'underscore': '../vendor/underscore/underscore',
    'backbone': '../vendor/backbone/backbone',
    'bootstrap': '../vendor/bootstrap/dist/js/bootstrap',
    'text': '../vendor/requirejs-text/text',
    'jquery.socialify': '../javascripts/plugins/jquery.socialify',
    'jquery.contactform': '../javascripts/plugins/jquery.contactform',
    'i18next': '../vendor/i18next/i18next.amd.withJQuery',
    'common': '../vendor/donut-common/index'
  },
  shim: {
    'bootstrap': ['jquery'],
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
      var $usernameParent = $username.parents('.form-group');
      var $email = $('form#signup').find('#signin-email');
      var $emailParent = $email.parents('.form-group');
      var $password = $('form#signup').find('#signin-password');
      var $passwordParent = $password.parents('.form-group');
      var errors = [];

      // Cleanup classes on form submission
      $usernameParent.removeClass(function (index, css) {
        return (css.match(/(has-(success|error))+/g) || []).join(' ');
      });
      $emailParent.removeClass(function (index, css) {
        return (css.match(/(has-(success|error))+/g) || []).join(' ');
      });
      $passwordParent.removeClass(function (index, css) {
        return (css.match(/(has-(success|error))+/g) || []).join(' ');
      });

      // Cleanup popover also
      $usernameParent.find('.help-block').html('');
      $emailParent.find('.help-block').html('');
      $passwordParent.find('.help-block').html('');

      // Check presense of username
      if ($username.val() === '') {
        errors.push({
          parent: $usernameParent,
          sibling: $username.siblings('.help-block'),
          message: i18next.t('forms.username-required')
        });
      // Check validity of username
      } else if (!common.validateUsername($username.val())) {
        errors.push({
          parent: $usernameParent,
          sibling: $username.siblings('.help-block'),
          message: i18next.t('forms.username-error')
        });
      }

      // Check presense of email
      if ($email.val() === '') {
        errors.push({
          parent: $emailParent,
          sibling: $email.siblings('.help-block'),
          message: i18next.t('forms.email-required')
        });
      // Check validity of email
      } else if (!common.validateEmail($email.val())) {
        errors.push({
          parent: $emailParent,
          sibling: $email.siblings('.help-block'),
          message: i18next.t('account.password.error.length')
        });
      }

      // Check presense of password
      if ($password.val() === '') {
        errors.push({
          parent: $passwordParent,
          sibling: $password.siblings('.help-block'),
          message: i18next.t('forms.password-required')
        });
      // Check validity of password
      } else if (!common.validatePassword($password.val())) {
        errors.push({
          parent: $passwordParent,
          sibling: $password.siblings('.help-block'),
          message: i18next.t('forms.password-error')
        });
      }

      if (errors.length > 0) {
        e.preventDefault(); // Prevent form submission
        _.each(errors, function (error) {
          error.parent.addClass('has-error');
          error.sibling.append(error.message);
        });
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
        text: i18next.t('chat.share.description', {name: $(this).data('name')})
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
