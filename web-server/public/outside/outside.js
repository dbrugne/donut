var $ = require('jquery');
var _ = require('underscore');
global.jQuery = $; // expose jQuery globally, needed for some beside plugins
require('bootstrap/js/transition');
require('bootstrap/js/dropdown');
require('bootstrap/js/modal');
require('bootstrap/js/tooltip');
require('bootstrap/js/popover');
require('../javascripts/jquery.socialify');
require('../javascripts/jquery.contactform');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var SearchView = require('./search');

// Contact form
$('[data-toggle="contactform"]').contactform({});

// Landing Page
var $landing = $('#landing');
if ($landing.length) {
  var searchView = new SearchView({el: $landing.find('.results .cards')});
  var limit = 20; // default limit on landing page (1st load)

  var emailPattern = /[\w.+-]+@[\w.-]+\.[a-z]{2,4}/i;
  var passwordPattern = /(.{4,255})$/i;

  var searchFunction = function (search, skip, replace) {

    var skipParam = '';
    if (skip && skip.users) {
      skipParam += '&skip_users=' + skip.users;
    }
    if (skip && skip.rooms) {
      skipParam += '&skip_rooms=' + skip.rooms;
    }
    if (skip && skip.groups) {
      skipParam += '&skip_groups=' + skip.groups;
    }

    $.ajax(window.location.protocol + '//' + window.location.host + '/rest/search?limit=' + limit + skipParam + '&q=' + search, {
      success: function (response) {
        var list = _.union(
          response.rooms
            ? response.rooms.list
            : [],
          response.groups
            ? response.groups.list
            : [],
          response.users
            ? response.users.list
            : []);

        var count = {
          users: $landing.find('.results .cards .card.card-user').length,
          rooms: $landing.find('.results .cards .card.card-room').length,
          groups: $landing.find('.results .cards .card.card-group').length
        };

        var more =
          (response.rooms
            ? response.rooms.count > count.rooms
            : false) ||
          (response.groups
            ? response.groups.count > count.groups
            : false);

        searchView.render({
          cards: list,
          title: false,
          search: false,
          more: more,
          replace: replace
        });
      }
    });
  };

  // Click load more button
  $landing.find('.load-more').click(function (e) {
    var search = $landing.find('#search-field').val();
    var count = {
      users: $landing.find('.results .cards .card.card-user').length,
      rooms: $landing.find('.results .cards .card.card-room').length,
      groups: $landing.find('.results .cards .card.card-group').length
    };
    searchFunction(search, count, false);
  });

  // click search button (responsive)
  $landing
    .find('.searchbar .action-search').click(function (e) {
      var search = $landing.find('.searchbar input').val();
      searchFunction(search, {}, true);
    });

  // submit form (search results) on non responsive
  $landing.find('.form-search').submit(function (e) {
    var search = $landing.find('#search-field').val();
    e.preventDefault();
    searchFunction(search, {}, true);
  });

  // validate signup form
  var $formSignup = $('form#signup');
  $formSignup.submit(function (e) {
    var $username = $formSignup.find('#signin-username');
    var $usernameParent = $username.parents('.form-group');
    var $email = $formSignup.find('#signin-email');
    var $emailParent = $email.parents('.form-group');
    var $password = $formSignup.find('#signin-password');
    var $passwordParent = $password.parents('.form-group');
    var errors = [];

    // Cleanup classes on form submission
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

    // Check presence of email
    if ($email.val() === '') {
      errors.push({
        parent: $emailParent,
        sibling: $email.siblings('.help-block'),
        message: i18next.t('forms.email-required')
      });
      // Check validity of email
    } else if (!emailPattern.test($email.val())) {
      errors.push({
        parent: $emailParent,
        sibling: $email.siblings('.help-block'),
        message: i18next.t('account.email.error.format')
      });
    }

    // Check presence of password
    if ($password.val() === '') {
      errors.push({
        parent: $passwordParent,
        sibling: $password.siblings('.help-block'),
        message: i18next.t('forms.password-required')
      });
      // Check validity of password
    } else if (!passwordPattern.test($password.val())) {
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
