$(function(){

    window.Server = new ChatServer( {debugOn: true} );
    window.Conversations = new ConversationsCollection;
    window.Chat = new ChatView;

    $("#test1").click(function (e) {
        console.log(Conversations);

//        Conversations.add(new OneToOne({ id: '4234234243278dsq7', user_id: 'fsdff'}));
//        Conversations.add(new OneToOne({ id: '132465987qsdssqsq', user_id: 'xxxx'}));
//        Conversations.add(new Room({ id: 'azeezezaezaezae', name: 'tdsest'}));
//        Conversations.add(new Room({ id: 'g4fd456gdg45df54g', name: 'test'}));
//        Conversations.add(new Room({ id: 'aze4a51dq1sqs2d3q', name: 'test2'}));
//        Conversations.add(new OneToOne({ id: 'azzeazzeezzezeze', user_id: 'trerererest'}));
    });

});