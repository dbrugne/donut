$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.ServerModel = Backbone.Model.extend({

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
        },

        unsubscribe: function(topic) { // @todo : replace by room_id
            this.get('session').unsubscribe(topic);
        },

        message: function(topic, msg) {
            this.get('session').publish(topic, msg);
        },

        searchForRooms: function(search, callbackSuccess, callbackError) {
            var that = this;
            this.get('session').call('searchForRooms', search).then(
                function(rooms) {
                    that.trigger('searchSuccess', { rooms: rooms });
                },
                function() {
                    that.trigger('searchError');
                }
            );
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    /**
     * Connection status block
     */
    Chat.StatusView = Backbone.View.extend({

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

});