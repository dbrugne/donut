$(function() {

    // @todo : refactor to allow direct Chat. call in subfiles
    window.Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    window.Chat.Server = Backbone.Model.extend({

        defaults: function() {
            return {
                server: '',
                sessionId: '',
                debugOn: false
            };
        },

        initialize: function() {
            // web_socket.js configuration
            WEB_SOCKET_SWF_LOCATION = "/js/WebSocketMain.swf";

            // Debug is on or not
            ab._debugrpc     = this.get('debugOn');
            ab._debugpubsub  = this.get('debugOn');
            ab._debugws      = this.get('debugOn');
            WEB_SOCKET_DEBUG = this.get('debugOn');
        },

        connect: function() {
            var that = this;
            // Autobahn connection
            ab.connect(
                'ws://' + window.location.hostname + ':8080/chat'
                , function(session) {
                    that.set('session', session); // session._session_id
                    that.trigger('connect');

                    // Subscribe to control topic
                    that.get('session').subscribe('ws://chat.local/control', function(topic, event) {
                        that.trigger(event.action, event.data);
                    });
                }
                , function(code, reason, detail) {
                    that.set('session', null);
                    that.debug(['Connection closed', code, reason, detail]);
                    that.trigger('close');
                }
                , {
                    'skipSubprotocolCheck': true,
                    'maxRetries': 60,
                    'retryDelay': 3500
                }
            );
        },

        error: function(error) {
            this.debug('Error: ' + error);
        },

        debug: function(message) {
            if (this.get('debugOn')) {
                console.log(message);
            }
        },

        subscribe: function(topic) {
            var that = this;
            this.get('session').subscribe(topic, function(topic, event) {
                that.trigger(event.action, {topic: topic, data: event.data});
            });
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    /**
     * Connection status block
     */
    window.Chat.StatusView = Backbone.View.extend({

        el: $('#button-status'),

        initialize: function() {
            this.update('connecting');

            this.listenTo(this.model, 'connect', function() {
                this.update('online');
            });

            this.listenTo(this.model, 'close', function() {
                this.update('offline');
            });
        },

        update: function(status) {
            // @todo : move this class as mixin in each status class
            this.$el.removeClass().addClass('btn').addClass('btn btn-xs');
            switch (status) {
                case 'online':
                    this.$el.addClass('btn-success').html('Online');
                    break;
                case 'connecting':
                    this.$el.addClass('btn-warning').html('Connecting');
                    break;
                case 'offline':
                    this.$el.addClass('btn-inverse').html('Offline');
                    break;
                case 'error':
                    this.$el.addClass('btn-danger').html('Offline');
                    break;
            }
        }

    });

    /**
     * Whole interface View
     */
    window.Chat.MainView = Backbone.View.extend({

        el: $("#chat"),

        events: {
            // Delegated events for creating new items, and clearing completed ones.
        },

        initialize: function() {
            //
        },

        run: function() {
            // Initialize server layer
            this.server = new window.Chat.Server( {debugOn: true} );
            new window.Chat.StatusView({model: this.server});

            // Rooms
            this.rooms = new window.Chat.RoomsCollection;
            new window.Chat.RoomsView({collection: this.rooms});

            // One to ones @todo
//            this.onetoones = new window.Chat.OneToOnesCollection;
//            new window.Chat.ConversationsView({collection: this.conversations});

            // Server events
            var that = this;
            this.listenTo(this.server, 'userIdentity', function(data) {
                that.currentUser = new window.Chat.User(data);
            });

            // Connection (only when all IHM are ready)
            this.server.connect();
        },

        // @todo : not here, should be in conversationsView
        focus: function(topic) {
            if (!this.conversations.length) {
                return;
            }

            var model;
            if (topic) {
                model = this.conversations.get(topic);
            } else {
                model = this.conversations.first();
            }

            model.focus();

//            $('.room-item[data-topic="'+topic+'"] > .badge').fadeOut(400, function () {
//                $('.room-item[data-topic="'+topic+'"] > .badge').html(0);
//            });
//
//            // Focus on input field
//            $('.input-message[data-topic="'+topic+'"]').focus();
//
//            // Set URL hash
//            if (ChatServer.isRoomTopic(topic)) {
//                var hash = 'room='+topic.replace(ChatServer.topicTypes.room_prefix, '');
//                window.location.hash = hash;
//            } else {
//                window.location.hash = '';
//            }
//
//            // Store current window
//            focusedWindow = topic;
        }

    });

});