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
            if (!('searchRoomModalView' in this)) {
                this.searchRoomModalView = new Chat.searchRoomModal();
            }

            this.searchRoomModalView.show();
        },

        createRoomModal: function() {

        },

        searchUserLink: function() {

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