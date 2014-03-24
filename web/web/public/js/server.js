$(function(){

    window.ChatServer = Backbone.Model.extend({

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

});