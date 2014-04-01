$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */


    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.WindowView = Backbone.View.extend({

        el: $(window),

        focused: true,

        unread: 0,

        title: '',

        initialize: function(options) {
            this.title = $(document).attr('title');

            // Bind events
            that = this;
            $(window).focus(function(event) {
                that.onFocus();
            });
            $(window).blur(function(event) {
                that.onBlur();
            });
            $(window).on('beforeunload', function() {
                return that.onClose();
            });
        },

        onBlur: function() {
            this.focused = false;
        },

        onFocus: function() {
            if (this.unread == 0) {
                return;
            }

            $(document).attr('title', this.title);
            this.unread = 0;
            this.focused = true;
        },

        increment: function() {
            if (this.focused) {
                return;
            }

            this.unread += 1;
            $(document).attr('title', '('+this.unread+') '+this.title);
        },

        onClose: function() {
            // only if at least one room is open
            if (Chat.discussions.length > 0) {
                return "If you leave this page all the room history will be lost.";
            } else {
                return;
            }
        }

    });

    Chat.MainView = Backbone.View.extend({

        el: $("#chat"),

        events: {
            'click #search-room-link': 'searchRoomModal',
            'click #create-room-link': 'createRoomModal',
            'click #search-user-link': 'searchUserLink'
        },

        initialize: function() {
            //
        },

        run: function() {
            // @todo move all of that in App init

            var that = this;

            // Status view
            new Chat.StatusView({model: Chat.server});

            // Discussions view
            new Chat.DiscussionsView({collection: Chat.discussions});

            // Online users view
            new Chat.OnlineUsersView({collection: new Chat.OnlineUsersCollection()});

            // Modals (reusable)
            this.createRoomModalView = new Chat.CreateRoomModal();
            this.searchRoomModalView = new Chat.SearchRoomModal();
            this.searchUserModalView = new Chat.SearchUserModal();
            this.userProfileModalView = new Chat.UserProfileModal();

            // Window events
            this.windowView = new Chat.WindowView();

            // Server events
            this.listenTo(Chat.server, 'userIdentity', function(data) {
                that.currentUser = new Chat.User(data);
            });

            // Connection (only when all IHM are ready)
            Chat.server.connect();
        },

        searchRoomModal: function() {
            this.searchRoomModalView.search();
            this.searchRoomModalView.show();
        },

        createRoomModal: function() {
            this.createRoomModalView.show();
        },

        searchUserLink: function() {
            this.searchUserModalView.search();
            this.searchUserModalView.show();
        },

        userProfileModal: function(user_id) {
            this.userProfileModalView.show(user_id);
        }

    });

    /* ====================================================== */
    /* =====================  ROUTER  ======================= */
    /* ====================================================== */

    Chat.Routes = Backbone.Router.extend({

        routes: {
            '':                 'root',
            'room/:name':       'focusRoom',
            'user/:user':       'focusOneToOne',
            '*default':         'default'
        },

        root: function() {
            console.log('router: home');
        },

        focusRoom: function(name) {
            Chat.discussions.focusRoomByName('#'+name);
        },

        focusOneToOne: function(username) {
            Chat.discussions.focusOneToOneByUsername(username);
        },

        default: function() {
            console.log('router: default');
            // @todo : handle 404 type behavior in DOM
        }
    });

});