<?php

/**********************************************
 * Bootstrap
 *********************************************/

require_once __DIR__.'/../vendor/autoload.php';
$app = new Silex\Application();
use Symfony\Component\HttpFoundation\Request;
use App\User;
$app['debug'] = true;

/**********************************************
 * Services
 *********************************************/
$app->register(new Silex\Provider\SessionServiceProvider());
$app->register(new Silex\Provider\DoctrineServiceProvider(), array(
    'db.options' => array(
        'driver'   => 'pdo_mysql',
        'dbname'   => 'chat',
        'host'     => 'localhost',
        'user'     => 'root',
        'password' => '',
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

//$app->post('setnickname', function (Request $request) use ($app) {
//    $username = $request->request->get('username', null);
//
//    if (!$username) {
//        return $app->redirect('/');
//    }
//
//    // Register user in database
//    $users = $app['db']->fetchAssoc("SELECT * FROM users WHERE username = ?", array($username));
//    if ($users === false) {
//        $app['db']->insert('users', array('username' => $username));
//        $id = $app['db']->lastInsertId();
//    }
//
//    $app['session']->set('user', array(
//        'id' => $id,
//        'username' => $username,
//    ));
//    return $app->redirect('/chat');
//
//});

$app->get('/chat', function() use ($app) {

    if (null === $user = $app['user.manager']->getCurrentUser()) {
        return $app->redirect('/');
    }

    return $app['twig']->render('chat.twig.html', array('user' => $user,));

    /**
     * Return DOM of chat interface
     *   Instanciate listener
     */

})->bind('chat');

$app->get('/up', function() use ($app) {

    /**
     * Le navigateur requête le serveur toutes les 1 seconde:
     * - le serveur vérifie que le navigateur a une session
     * - que l'utilisateur de la session existe toujours
     * - update onlines
     * - nettoie onlines
     * - retourne les messages/membres/annonces
     *
     */

    if (null === $user = $app['user.manager']->getCurrentUser()) {
        $app->abort(403, "User not authenticated.");
    }

    // Is the user already registered in this room?
    $online = $app['db']->fetchAssoc("SELECT * FROM onlines WHERE user_id = ?", array($user->getId()));
    if ($online === false) {
        // Register him
        $app['db']->insert('onlines', array(
            'ip' => $app['request']->server->get('REMOTE_ADDR'),
            'user_id' => $user->getId(),
            'status' => 2,
        ));
    } else {
        // Update him
        $app['db']->executeQuery("UPDATE onlines SET `time` = NOW() WHERE user_id = ?", array($user->getId()));
    }

    // Obsolete online rows
    $app['db']->executeQuery("DELETE FROM onlines WHERE time < DATE_SUB(NOW(), INTERVAL 50 SECOND)", array());

    // Data to return
    $channel = $app['db']->fetchAssoc("SELECT topic FROM channels ORDER BY id DESC LIMIT 1");
    $topic = ($channel !== false) ? $channel['topic'] : "";

    $from = 0;
    $sql = "SELECT m.id as id, m.user_id as user_id, m.time as time, m.message as message, u.username as username
          FROM messages as m LEFT JOIN users as u ON m.user_id = u.id
          WHERE m.id > :lastid
          ORDER BY m.`time` ASC LIMIT 0,1000";
    $messages = $app['db']->fetchAll($sql, array('lastid' => $from));

    $sql = "SELECT u.username as username, o.status as status
	FROM onlines as o LEFT JOIN users as u ON u.id = o.user_id ORDER BY u.username";
    $members = $app['db']->fetchAll($sql, array());

    $data = array(
        'error' => 0,
        'messages' => $messages,
        'members' => $members,
        'topic' => $topic,
    );
    return $app->json($data, 200);
});

$app->get('/channels', function() use ($app) {

    if (null === $user = $app['user.manager']->getCurrentUser()) {
        return $app->redirect('/');
    }

    $channels = array(
        "tf1" => array("code" => "tf1", "name" => "TF1", "url" => "http://www.tf1.fr:", "logo" => "chaines_03.jpg"),
        "france2" => array("code" => "france2", "name" => "France2", "url" => "http://www.france2.fr/", "logo" => "chaines_04.jpg"),
        "france3" => array("code" => "france3", "name" => "France3", "url" => "http://www.france3.fr/", "logo" => "chaines_05.jpg"),
        "canal+" => array("code" => "canal+", "name" => "canal+", "url" => "http://www.canalplus.fr/", "logo" => "chaines_06.jpg"),
        "france5" => array("code" => "france5", "name" => "France5", "url" => "http://www.france5.fr/", "logo" => "chaines_07.jpg"),
        "m6" => array("code" => "m6", "name" => "M6", "url" => "http://www.M6.fr/", "logo" => "chaines_08.jpg"),
        "arte" => array("code" => "arte", "name" => "Arte", "url" => "http://www.arte.tv/fr", "logo" => "chaines_09.jpg"),
        "d8" => array("code" => "d8", "name" => "D8", "url" => "http://www.d8.tv/", "logo" => "chaines_11.jpg"),
        "w9" => array("code" => "w9", "name" => "w9", "url" => "http://www.w9.fr/", "logo" => "chaines_12.jpg"),
        "tmc" => array("code" => "tmc", "name" => "TMC", "url" => "http://www.tmc.tv/", "logo" => "chaines_13.jpg"),
        "nt1" => array("code" => "nt1", "name" => "NT1", "url" => "http://www.nt1.tv/", "logo" => "chaines_14.jpg"),
        "nrj12" => array("code" => "nrj12", "name" => "NRJ12", "url" => "http://www.nrj12.fr/", "logo" => "chaines_15.jpg"),
        "lcp" => array("code" => "lcp", "name" => "LCP", "url" => "http://www.lcp.fr/", "logo" => "chaines_16.jpg"),
        "france4" => array("code" => "france4", "name" => "France4", "url" => "http://www.france4.fr/", "logo" => "chaines_17.jpg"),
        "bfmtv" => array("code" => "bfmtv", "name" => "BFM TV", "url" => "http://www.bfmtv.com", "logo" => "chaines_18.jpg"),
        "itele" => array("code" => "itele", "name" => "iTélé", "url" => "http://www.itele.fr/", "logo" => "chaines_19.jpg"),
        "d17" => array("code" => "d17", "name" => "D17", "url" => "http://www.d17.tv/", "logo" => "chaines_20.jpg"),
        "gulli" => array("code" => "gulli", "name" => "Gulli", "url" => "http://www.gulli.fr/", "logo" => "chaines_21.jpg"),
        "franceo" => array("code" => "franceo", "name" => "FranceÔ", "url" => "http://www.franceo.fr/", "logo" => "chaines_22.jpg"),
        "lequipe21" => array("code" => "lequipe21", "name" => "L'équipe 21", "url" => "http://www.lequipe21.fr/", "logo" => "chaines_23.jpg"),
        "numero23" => array("code" => "numero23", "name" => "numéro 23", "url" => "http://www.numero23.fr/", "logo" => "chaines_24.jpg"),
        "rmcdecouverte" => array("code" => "rmcdecouverte", "name" => "RMC découverte", "url" => "http://www.rmcdecouverte.com/", "logo" => "chaines_25.jpg"),
        "cherie25" => array("code" => "cherie25", "name" => "Chérie 25", "url" => "http://cherie25.fr/", "logo" => "chaines_26.jpg"),
        "tv8montblanc" => array("code" => "tv8montblanc", "name" => "TV 8 Mont Blanc", "url" => "http://www.tv8montblanc.fr/", "logo" => "TNTSAT_TV8.jpg"),
        "bfmbusiness" => array("code" => "bfmbusiness", "name" => "BFM Business", "url" => "http://www.bfmtv.com/", "logo" => "bfm-business.gif"),
        "cashtv" => array("code" => "cashtv", "name" => "CashTV", "url" => "http://www.cashtv.com/", "logo" => "cashTV.gif"),
        "cntv" => array("code" => "cntv", "name" => "CNTV", "url" => "http://fr.cntv.cn/", "logo" => "cctv.gif"),
        "euronews" => array("code" => "euronews", "name" => "Euronews", "url" => "http://fr.euronews.net/", "logo" => "euronews.gif"),
        "france24" => array("code" => "france24", "name" => "France24", "url" => "http://www.france24.com/", "logo" => "france24.gif"),
        "m6boutique" => array("code" => "m6boutique", "name" => "M6 boutique", "url" => "http://www.m6boutique.com/", "logo" => "m6boutique.gif"),
        "tv5" => array("code" => "tv5", "name" => "TV5", "url" => "http://www.tv5.org/TV5Site/europe/", "logo" => "TV5europe.gif"),
        "tv5monde" => array("code" => "tv5monde", "name" => "TV5 Monde", "url" => "http://www.tv5.org/", "logo" => "TV5monde.gif"),
    );

    return $app['twig']->render('channels.twig.html', array(
        'channels' => $channels,
    ));

})->bind('channels');

$app->get('/', function(Request $request) use ($app) {

    return $app['twig']->render('welcome.twig.html', array(
        'error' => $app['security.last_error']($request),
        'last_username' => $app['session']->get('_security.last_username'),
    ));

});

$app->run();
