$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.MainView = Backbone.View.extend({

        el: $("#chat"),

        currentUser: '',

        events: {
            'click #search-room-link': 'searchRoomModal',
            'click #create-room-link': 'createRoomModal',
            'click #search-user-link': 'searchUserLink'
        },

        initialize: function() {
            // Status view
            this.statusView = new Chat.StatusView({model: Chat.server});

            // Discussions view
            this.discussionsView = new Chat.DiscussionsView({collection: Chat.discussions});

            // Online users block
            this.usersBlock = new Chat.OnlineUsersView({collection: new Chat.OnlineUsersCollection()});

            // Modals (reusable)
            this.createRoomModalView = new Chat.CreateRoomModal();
            this.searchRoomModalView = new Chat.SearchRoomModal();
            this.searchUserModalView = new Chat.SearchUserModal();
            this.userProfileModalView = new Chat.UserProfileModal();

            // Window view
            this.windowView = new Chat.WindowView();

            // Server (user identity)
            var that = this;
            this.listenTo(Chat.server, 'userIdentity', function(data) {
                that.currentUser = new Chat.User(data);
            });
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