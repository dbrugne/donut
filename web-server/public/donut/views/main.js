define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'collections/rooms',
  'collections/onetoones',
  'views/window',
  'views/current-user',
  'views/alert',
  'views/home',
  'views/quick-search',
  'views/drawer',
  'views/drawer-room-create',
  'views/drawer-room-profile',
  'views/drawer-room-edit',
  'views/drawer-room-delete',
  'views/drawer-user-profile',
  'views/drawer-user-edit',
  'views/drawer-user-account',
  'views/room',
  'views/onetoone',
  'views/discussions-block'
], function ($, _, Backbone, client, currentUser, rooms, onetoones, windowView,
             CurrentUserView, AlertView, HomeView, QuickSearchView,
             DrawerView,
             DrawerRoomCreateView, DrawerRoomProfileView, DrawerRoomEditView,
             DrawerRoomDeleteView,
             DrawerUserProfileView, DrawerUserEditView, DrawerUserAccountView,
             RoomView, OneToOneView,
             DiscussionsBlockView) {

  var MainView = Backbone.View.extend({

    el: $("#chat"),

    $home: $('#home'),

    $discussionsPanelsContainer: $("#center"),

    firstConnection: true,

    thisDiscussionShouldBeFocusedOnSuccess: '',

    defaultColor: '',

    currentColor: '',

    events: {
      'click .go-to-search'             : 'focusOnSearch',
      'click .open-create-room'         : 'openCreateRoom',
      'click .open-user-edit'           : 'openUserEdit',
      'click .open-user-account'        : 'openUserAccount',
      'click .open-user-profile'        : 'openUserProfile',
      'dblclick .dbl-open-user-profile' : 'openUserProfile',
      'click .open-room-profile'        : 'openRoomProfile',
      'click .open-room-edit'           : 'openRoomEdit',
      'click .open-room-delete'         : 'openRoomDelete',
      'click .close-discussion'         : 'onCloseDiscussion',
      'mouseenter *[data-toggle="image-popover"]': 'onEnterImage',
      'mouseleave *[data-toggle="image-popover"]': 'onLeaveImage'
    },

    initialize: function() {
      this.defaultColor = window.room_default_color;

      this.listenTo(client, 'welcome', this.onWelcome);
      this.listenTo(rooms, 'add', this.addRoomView);
      this.listenTo(onetoones, 'add', this.addOneView);
      this.listenTo(rooms, 'kicked', this.roomKicked); // @todo: nasty event
      this.listenTo(rooms, 'deleted', this.roomRoomDeleted); // @todo: nasty event
    },

    onEnterImage: function(event) {
      event.preventDefault();
      var $image = $(event.currentTarget);
      var cloudinaryId = $image.attr('data-cloudinary-id');
      var url = $.cd.natural(cloudinaryId, 150, 150);
      $image.popover({
        animation: false,
        content: '<img src="'+url+'" alt="user contribution">',
        html: true,
        placement: 'auto left',
        viewport: $image.closest('div.mCSB_container')
      });

      $image.on('shown.bs.popover', function () {
        var $i = $('.popover-content img');
        $i.bind('load', function() {
          if ($image.data('imgloaded'))
            return;

          $image.data('imgloaded', true);
          $image.popover('show');
        });
      });

      $image.popover('show');
    },
    onLeaveImage: function(event) {
      $image = $(event.currentTarget);
      $image.popover('hide');
    },

    run: function() {
      // generate and attach subviews
      this.currentUserView = new CurrentUserView({model: currentUser});
      this.discussionsBlock = new DiscussionsBlockView({mainView: this});
      this.drawerView = new DrawerView({mainView: this});
      this.alertView = new AlertView({mainView: this});

      // @todo : reuse for top navbar
//      this.quickSearchView = new QuickSearchView({
//        el: this.$el.find('#block-search'),
//        mainView: this
//      });

      // @debug
      window.current = currentUser;
      window.rooms = rooms;
      window.onetoones = onetoones;
    },

    alert: function(type, message) {
      type = type || 'info';
      this.alertView.show(type, message);
    },

    _color: function(color) {
      this.$el.find('#color').css('background-color', color);
      //var previous = this.$el.find('#color').css('background-color');
      //var that = this;
      //this.underAnimation = true;
      //that.$el.find('#color-default').css('background-color', previous);
      //this.$el.find('#color').animate({
      //  opacity: '0'
      //}, 200, function() {
      //  that.$el.find('#color').css('background-color', color);
      //  that.$el.find('#color').animate({
      //    opacity: '1'
      //  }, 200, function() {
      //    // done
      //  });
      //});
    },

    color: function(color, temporary, reset) {
      if (reset)
        return this._color(this.currentColor);

      color = color || this.defaultColor;

      if (!temporary)
        this.currentColor = color;

      return this._color(color);
    },

    _handleAction: function(event) {
      if (!event) return false;
      event.preventDefault();
      event.stopPropagation();
    },

    /**
     * Executed each time the connexion with server is re-up (can occurs multiple
     * time in a same session)
     * @param data
     */
    onWelcome: function(data) {
      var start = Date.now();
      var that = this;

      // Welcome message (only on first connection)
      if (this.firstConnection && data.user.welcome !== false) { // show if true or if undefined
        $('#welcome').on('hide.bs.modal', function (e) {
          if (data.user.welcome == true
            && $(e.currentTarget).find(".checkbox input[type='checkbox']").prop('checked') === true) {
            client.userUpdate({welcome: false}, function(data) { window.debug.log('user preference saved: ', data); });
          }
        });
        $('#welcome').modal({});
      }

      // Current user data (should be done before onetoone logic)
      if (data.hello)
        this.currentUserView.hello = data.hello;
      currentUser.set(data.user, {silent: true});
      this.currentUserView.render();

      var durationBefore = Date.now() - start;

      // Rooms
      _.each(data.rooms, function(room) {
        rooms.addModel(room, !that.firstConnection);
      });
      var durationRooms = Date.now() - start - durationBefore;

      // One to ones
      _.each(data.onetoones, function(one) {
        onetoones.addModel(one, !that.firstConnection);
      });
      var durationOnes = Date.now() - start - durationRooms;

      this.discussionsBlock.redraw();

      // first connection indicator
      if (this.firstConnection)
        this.firstConnection = false;

      // Run routing only when everything in interface is ready
      this.trigger('ready');
      window.debug.log('welcome done in '+(Date.now()-start)+'ms ('+durationBefore+','+durationRooms+','+durationOnes+')');
    },

    /**
     * Trigger when currentUser is kicked from a room to handle focus and
     * notification
     * @param event
     * @returns {boolean}
     */
     roomKicked: function(data) {
      this.focus();
      var message = $.t("chat.kickmessage")+data.name;
      if (data.reason)
        message += ' (reason: '+data.reason+')';
      this.alert('warning', message);
    },
     roomRoomDeleted: function(data) {
      this.focus();
      if (data && data.reason)
        this.alert('warning', data.reason);
    },

    // DRAWERS
    // ======================================================================

    openCreateRoom: function(event) {
      this._handleAction(event);

      var view = new DrawerRoomCreateView({ mainView: this });
      this.drawerView.setSize('450px').setView(view).open();

      return false; // stop propagation
    },
    openUserAccount: function(event) {
      this._handleAction(event);

      var view = new DrawerUserAccountView({ mainView: this });
      this.drawerView.setSize('320px').setView(view).open();

      return false; // stop propagation
    },
    openUserProfile: function(event) {
      this._handleAction(event);

      var username = $(event.currentTarget).data('username');
      if (!username)
        return;

      var view = new DrawerUserProfileView({ mainView: this, username: username });
      this.drawerView.setSize('320px').setView(view).open();

      return false; // stop propagation
    },
    openRoomProfile: function(event) {
      this._handleAction(event);

      var name = $(event.currentTarget).data('roomName');
      if (!name)
        return;

      var view = new DrawerRoomProfileView({ mainView: this, name: name });
      this.drawerView.setSize('320px').setView(view).open();

      return false; // stop propagation
    },
    openRoomEdit: function(event) {
      this._handleAction(event);

      var name = $(event.currentTarget).data('roomName');
      if (!name)
        return;

      var view = new DrawerRoomEditView({ mainView: this, name: name });
      this.drawerView.setSize('450px').setView(view).open();

      return false; // stop propagation
    },
    openRoomDelete: function(event) {
      this._handleAction(event);

      var name = $(event.currentTarget).data('roomName');
      if (!name)
        return;

      var view = new DrawerRoomDeleteView({ mainView: this, name: name });
      this.drawerView.setSize('450px').setView(view).open();

      return false; // stop propagation
    },
    openUserEdit: function(event) {
      this._handleAction(event);

      var view = new DrawerUserEditView({ mainView: this });
      this.drawerView.setSize('450px').setView(view).open();

      return false; // stop propagation
    },

    // DISCUSSIONS MANAGEMENT
    // ======================================================================

    addRoomView: function(model, collection, options) {
      var view = new RoomView({
        collection: collection,
        model:      model,
        mainView:   this
      });
      this.$discussionsPanelsContainer.append(view.$el);

      if (this.thisDiscussionShouldBeFocusedOnSuccess == model.get('name')) {
        this.focus(model);
        this.thisDiscussionShouldBeFocusedOnSuccess = null;
      }
    },

    addOneView: function(model, collection, options) {
      var view = new OneToOneView({
        collection: collection,
        model:      model,
        mainView:   this
      });
      this.$discussionsPanelsContainer.append(view.$el);

      if (this.thisDiscussionShouldBeFocusedOnSuccess == model.get('username')) {
        this.focus(model);
        this.thisDiscussionShouldBeFocusedOnSuccess = null;
      }
    },

    onCloseDiscussion: function(event) {
      this._handleAction(event);

      var $target = $(event.currentTarget).closest('a.item').first();
      if (!$target)
        return;

      if ($target.data('type') == 'room') {
        this.closeRoom($target.data('identifier'));
      } else {
        this.closeOne($target.data('identifier'));
      }

      this.discussionsBlock.redraw();
      this.persistPositions(true);

      return false; // stop propagation
    },

    closeRoom: function(name) {
      var model = rooms.findWhere({ name: name });
      if (model == undefined) return;

      var focused = model.get('focused');

      // Remove entity (on remove window will autodestroy)
      model.leave();
      rooms.remove(model);

      // Focus default
      if (focused)
        this.focusHome();
    },

    closeOne: function(username) {
      var model = onetoones.findWhere({ username: username });
      if (model == undefined) return;

      var focused = model.get('focused');

      // Remove entity (on remove: window will autodestroy)
      model.leave();
      onetoones.remove(model);

      // Focus default
      if (focused)
        this.focusHome();
    },

    persistPositions: function(silent) {
      silent = silent | false;

      var positions = [];
      this.discussionsBlock.$list.find('a.item').each(function() {
        var identifier = $(this).data('identifier');
        if (identifier)
          positions.push(identifier);
      });

      currentUser.set({positions: positions}, {silent: silent});
      client.userUpdate({positions: positions}, function(data) {
        if (data.err)
          window.debug.log('error(s) on userUpdate call', data.errors);
      });
    },

    // FOCUS TAB/PANEL MANAGEMENT
    // ======================================================================

    focusOnSearch: function(event) {
      this.focusHome(true);
      this.homeView.searchView.$search
          .focus();
      this.drawerView.close();
    },

    unfocusAll: function() {
      rooms.each(function(o, key, list) {
        o.set('focused', false);
      });
      onetoones.each(function(o, key, list) {
        o.set('focused', false);
      });
      this.$home.hide();
    },

    // called by router only
    focusHome: function(avoidReload) {
      // init view
      if (!this.homeView)
        this.homeView = new HomeView({});

      // @todo : change pattern to render page with spinner and replace content on callback
      if (avoidReload !== true)
        client.home();

      this.unfocusAll();
      this.$home.show();
      windowView.setTitle();
      this.discussionsBlock.redraw();
      this.color(this.defaultColor);
      Backbone.history.navigate('#'); // just change URI, not run route action
    },

    // called by router only
    focusRoomByName: function(name) {
      var model = rooms.iwhere('name', name);
      if (model == undefined) {
        // Not already open
        this.thisDiscussionShouldBeFocusedOnSuccess = name;
        rooms.join(name);
        return;
      } else {
        this.focus(model);
      }
    },

    // called by router only
    focusOneToOneByUsername: function(username) {
      var model = onetoones.iwhere('username', username);
      if (model == undefined) {
        // Not already open
        this.thisDiscussionShouldBeFocusedOnSuccess = username;
        onetoones.join(username);
        return;
      } else {
        this.focus(model);
      }
    },

    focus: function(model) {
      // No opened discussion, display default
      if (rooms.length < 1 && onetoones.length < 1) {
        return this.focusHome();
      }

      // No discussion provided, take first
      if (model == undefined) {
        model = rooms.first();
        if (model == undefined) {
          model = onetoones.first();
          if (model == undefined) {
            return this.focusHome();
          }
        }
      }

      // Unfocus every model
      this.unfocusAll();

      // Focus the one we want
      model.set('focused', true);
      model.set('unread', 0);
      this.discussionsBlock.redraw();

      // Change interface color
      if (model.get('color'))
        this.color(model.get('color'));
      else
        this.color(this.defaultColor);

      // Update URL (always!) and page title
      var uri;
      var title;
      if (model.get('type') == 'room') {
        uri = 'room/'+model.get('name').replace('#', '');
        title = model.get('name');
      } else {
        uri = 'user/'+model.get('username');
        title = model.get('username');
      }
      windowView.setTitle(title);
      Backbone.history.navigate(uri); // just change URI, not run route action

      this.drawerView.close();
    }

  });

  return new MainView();
});