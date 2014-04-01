$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */


    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

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

            // Server events
            var that = this;
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
            //
        },

        focusRoom: function(name) {
            Chat.discussions.focusRoomByName(name);
        },

        focusOneToOne: function(username) {
            Chat.discussions.focusOneToOneByUsername(username);
        },

        default: function() {
            console.log('go in default');
            // @todo : handle 404 type behavior in DOM
        }
    });

});