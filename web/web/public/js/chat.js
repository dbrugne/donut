$(function() {

    // @todo : refactor to allow direct Chat. call in subfiles
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
            // Status view
            new Chat.StatusView({model: Chat.server});

            // Rooms view
            new Chat.RoomsView({collection: Chat.rooms});

            // Online users view
            new Chat.UsersBlockView({collection: new Chat.OnlineUsersCollection()});

            // Smileys view
            new Chat.SmileysView({collection: Chat.smileys});

            // One to ones @todo
//            this.onetoones = new Chat.OneToOnesCollection;
//            new Chat.ConversationsView({collection: this.conversations});

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

        focusRoom: function(room_name) {
            // @todo : auto-join room when arrive on interface with #room/TF1 (from homepage for example)
                // should determine room topic and call subscribe (so easy)
                // and maybe persist that room was call initially in a variable

            var room = Chat.rooms.findWhere({name: room_name});
            if (room == undefined) {
                this.navigate('');
                return;
            }
            Chat.rooms.focus(room.get('id'));
        },

        focusOneToOne: function(user_id) {
            //
        },

        default: function() {
            console.log('go in default');
            // @todo : handle 404 type behavior in DOM
        }
    });

});