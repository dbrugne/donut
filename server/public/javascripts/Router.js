$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  ROUTER  ======================= */
    /* ====================================================== */

    // @todo : now window reopen not pertubate routing:
    // - should change room focus/open and onetoone focus open to use router only
    // - should auto join room/onetoone on arriving on page
    // - should auto focus first room if no is focused

    Chat.Routes = Backbone.Router.extend({

        routes: {
            '':                 'root',
            'room/:name':       'focusRoom',
            'user/:user':       'focusOneToOne',
            '*default':         'default'
        },

        root: function() {
            console.log('router: home');
            Chat.discussions.focus();
        },

        focusRoom: function(name) {
            console.log('router: focusRoom '+name);
            Chat.discussions.focusRoomByName('#'+name);
        },

        focusOneToOne: function(username) {
            console.log('router: focusOneToOne ' + username);
            Chat.discussions.focusOneToOneByUsername(username);
        },

        default: function() {
            console.log('router: default');
            // @todo : handle 404 type behavior in DOM
        }
    });

});