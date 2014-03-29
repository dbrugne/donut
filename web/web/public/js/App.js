$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */


    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    // Whole interface View
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
            new Chat.UsersBlockView({collection: new Chat.OnlineUsersCollection()});

            // Server events
            var that = this;
            this.listenTo(Chat.server, 'userIdentity', function(data) {
                that.currentUser = new Chat.User(data);
            });

            // Connection (only when all IHM are ready)
            Chat.server.connect();
        },

        searchRoomModal: function() {
            // @todo : move view instanciation in run function
            if (!('searchRoomModalView' in this)) {
                this.searchRoomModalView = new Chat.searchRoomModal();
            }

            this.searchRoomModalView.show();
        },

        createRoomModal: function() {
            // @todo
        },

        searchUserLink: function() {
            // @todo : move view instanciation in run function
            if (!('searchUserModalView' in this)) {
                this.searchUserModalView = new Chat.searchUserModal();
            }

            this.searchUserModalView.show();
        },

        userProfileModal: function(user_id) {
            // @todo : move view instanciation in run function
            if (!('userProfileModalView' in this)) {
                this.userProfileModalView = new Chat.userProfileModal();
            }

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