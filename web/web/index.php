<?php

/**********************************************
 * Bootstrap
 *********************************************/
require_once __DIR__.'/../vendor/autoload.php';
$app = new Silex\Application();
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\PdoSessionHandler;
use App\User;
use App\Chat;
$app['debug'] = true;


/**********************************************
 * Services
 *********************************************/
$app->register(new Silex\Provider\SessionServiceProvider());
$app['pdo.dsn'] = 'mysql:dbname=chat';
$app['pdo.user'] = 'root';
$app['pdo.password'] = '';
$app['session.db_options'] = array(
    'db_table'      => 'sessions',
    'db_id_col'     => 'session_id',
    'db_data_col'   => 'session_value',
    'db_time_col'   => 'session_time',
);
$app['pdo'] = $app->share(function () use ($app) {
    return new PDO(
        $app['pdo.dsn'],
        $app['pdo.user'],
        $app['pdo.password']
    );
});
$app['pdo']->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
$app['session.storage.handler'] = $app->share(function () use ($app) {
    return new PdoSessionHandler(
        $app['pdo'],
        $app['session.db_options'],
        $app['session.storage.options']
    );
});
$app->register(new Silex\Provider\DoctrineServiceProvider(), array(
    'db.options' => array(
        'driver'   => 'pdo_mysql',
        'dbname'   => 'chat',
        'host'     => 'localhost',
        'user'     => $app['pdo.user'],
        'password' => $app['pdo.password'],
    ),
)); // doc: http://www.doctrine-project.org/api/dbal/2.4/class-Doctrine.DBAL.Connection.html
$app->register(new Silex\Provider\SecurityServiceProvider(), array(
    'security.firewalls' => array(
        'secured_area' => array(
            'pattern' => '^.*$',
            'anonymous' => true,
            'remember_me' => array(),
            'form' => array(
                'login_path' => '/user/login',
                'check_path' => '/user/login_check',
            ),
            'logout' => array(
                'logout_path' => '/user/logout',
            ),
            'users' => $app->share(function($app) { return $app['user.manager']; }),
        ),
    ),
));
$app->register($u = new App\User\UserServiceProvider());
$app->register(new Silex\Provider\RememberMeServiceProvider());
$app->register(new Silex\Provider\ServiceControllerServiceProvider());
$app->register(new Silex\Provider\UrlGeneratorServiceProvider());
$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path' => __DIR__.'/../views',
));

$app['user.controller']->setLayoutTemplate('layout.twig.html');


/**********************************************
 * Controllers
 *********************************************/
$app->mount('/user', $u);

$app->get('/join/{room_id}', function($room_id) use ($app) {

    if (null === $user = $app['user.manager']->getCurrentUser()) {
        return $app->redirect('/');
    }

    $roomManager = new App\Chat\RoomManager($app);
    if (null === $room = $roomManager->findOneBy(array('id' => $room_id))) {
        return $app->redirect('/');
    }

    // If user is not already in the requested chat, register him
    $userRoomManager = new App\Chat\UserRoomManager($app);
    $criteria = array('user_id' => $user->getId(), 'room_id' => $room->getId());
    if (null === $userRoom = $userRoomManager->findOneBy($criteria)) {
        $userRoom = $userRoomManager->insert(array(
            'user_id' => $user->getId(),
            'room_id' => $room->getId(),
        ));
    }

    // Redirect to chat
    return $app->redirect('/chat');
})
->bind('join')
->assert('room_id', '\d+');

$app->get('/chat', function() use ($app) {

    if (null === $user = $app['user.manager']->getCurrentUser()) {
        return $app->redirect('/');
    }

    // Prepare rooms list (first load)
    $urm = new App\Chat\UserRoomManager($app);
    $mm = new App\Chat\MessageManager($app);
    $rooms = $urm->roomsList($user->getId());

    foreach($rooms as $room)
    {
        // users list
        $users = $urm->usersList($room->getId());
        $room->setUsers($users);

        // messages
        $messages = $mm->findBy(array('room_id' => $room->getId()));
        $room->setMessages($messages);
    }

    return $app['twig']->render('chat.twig.html', array(
        'user' => $user,
        'rooms' => $rooms,
    ));

})->bind('chat');

//$app->get('/up', function() use ($app) {
//
//    /**
//     * Le navigateur requête le serveur toutes les 1 seconde:
//     * - le serveur vérifie que le navigateur a une session
//     * - que l'utilisateur de la session existe toujours
//     * - update onlines
//     * - nettoie onlines
//     * - retourne les messages/membres/annonces
//     *
//     */
//
//    if (null === $user = $app['user.manager']->getCurrentUser()) {
//        $app->abort(403, "User not authenticated.");
//    }
//
//    // Is the user already registered in this room?
//    $online = $app['db']->fetchAssoc("SELECT * FROM onlines WHERE user_id = ?", array($user->getId()));
//    if ($online === false) {
//        // Register him
//        $app['db']->insert('onlines', array(
//            'ip' => $app['request']->server->get('REMOTE_ADDR'),
//            'user_id' => $user->getId(),
//            'status' => 2,
//        ));
//    } else {
//        // Update him
//        $app['db']->executeQuery("UPDATE onlines SET `time` = NOW() WHERE user_id = ?", array($user->getId()));
//    }
//
//    // Obsolete online rows
//    $app['db']->executeQuery("DELETE FROM onlines WHERE time < DATE_SUB(NOW(), INTERVAL 50 SECOND)", array());
//
//    // Data to return
//    $channel = $app['db']->fetchAssoc("SELECT topic FROM channels ORDER BY id DESC LIMIT 1");
//    $topic = ($channel !== false) ? $channel['topic'] : "";
//
//    $from = 0;
//    $sql = "SELECT m.id as id, m.user_id as user_id, m.time as time, m.message as message, u.username as username
//          FROM messages as m LEFT JOIN users as u ON m.user_id = u.id
//          WHERE m.id > :lastid
//          ORDER BY m.`time` ASC LIMIT 0,1000";
//    $messages = $app['db']->fetchAll($sql, array('lastid' => $from));
//
//    $sql = "SELECT u.username as username, o.status as status
//	FROM onlines as o LEFT JOIN users as u ON u.id = o.user_id ORDER BY u.username";
//    $members = $app['db']->fetchAll($sql, array());
//
//    $data = array(
//        'error' => 0,
//        'messages' => $messages,
//        'members' => $members,
//        'topic' => $topic,
//    );
//    return $app->json($data, 200);
//});

$app->get('/', function(Request $request) use ($app) {

    $tvcm = new App\Chat\TvChannelManager($app);
    $channels = array();
    foreach ($tvcm->findBy() as $channel)
    {
        $channels[] = $channel->getData();
    }

    return $app['twig']->render('welcome.twig.html', array(
        'error' => $app['security.last_error']($request),
        'last_username' => $app['session']->get('_security.last_username'),
        'channels' => $channels,
    ));

});

$app->run();
