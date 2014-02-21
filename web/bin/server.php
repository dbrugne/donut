<?php

use Ratchet\Server\IoServer;
use Ratchet\Server\FlashPolicy;
use Ratchet\WebSocket\WsServer;
use Ratchet\Wamp\ServerProtocol;
use Ratchet\Http\HttpServer;
use Ratchet\Session\SessionProvider;

use React\EventLoop\Factory;
use React\Socket\Server as Reactor;
//use React\ZMQ\Context;

use Symfony\Component\HttpFoundation\Session\Storage\Handler\PdoSessionHandler;

use Server\Components\ChatRoom;
use Server\Components\Bot;
use Server\Components\Authentication;
use Server\Components\PortLogger;
use Server\Components\NullComponent;
use Server\Components\MessageLogger;

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

// Composer: The greatest thing since sliced bread
require_once __DIR__.'/../vendor/autoload.php';

// Setup application
$app = new Silex\Application();

/**********************************************
 * Configuration
 *********************************************/
if (!file_exists(__DIR__.'/../env') || null == $env = file_get_contents(__DIR__.'/../env')) {
    die('no, sorry!');
}
$configuration = parse_ini_file(__DIR__."/../config/{$env}.ini");
foreach ($configuration as $k => $v) {
    $app[$k] = $v;
}

/**********************************************
 * Database
 *********************************************/
$app['pdo'] = $app->share(function () use ($app) {
    return new PDO(
        $app['pdo.dsn'] = 'mysql:dbname='.$app['pdo.dbname'],
        $app['pdo.user'],
        $app['pdo.password']
    );
});
$app['pdo']->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
$app->register(new Silex\Provider\DoctrineServiceProvider(), array(
    'db.options' => array(
        'driver'   => 'pdo_mysql',
        'dbname'   => $app['pdo.dbname'],
        'host'     => $app['pdo.host'],
        'user'     => $app['pdo.user'],
        'password' => $app['pdo.password'],
    ),
));

/**********************************************
 * Session
 *********************************************/
$app['session.db_options'] = array(
    'db_table'      => 'sessions',
    'db_id_col'     => 'session_id',
    'db_data_col'   => 'session_value',
    'db_time_col'   => 'session_time',
);
$app['session.storage.handler'] = $app->share(function () use ($app) {
    return new PdoSessionHandler(
        $app['pdo'],
        $app['session.db_options'],
        array()
    );
});

/**********************************************
 * Logging
 *********************************************/
$stdout = new StreamHandler('php://stdout');
$logout = new Logger('SockOut');
$login  = new Logger('Sock-In');
$login->pushHandler($stdout);
$logout->pushHandler($stdout);

/**********************************************
 * Server
 *********************************************/
// The all mighty event loop
$loop = Factory::create();

// This little thing is to check for connectivity...
// As a case study, when people connect on port 80, we're having them
//  also connect on port 9000 and increment a counter if they connect.
// Later, we can publish the results and find out if WebSockets over
//  a port other than 80 is viable (theory is blocked by firewalls).
//$context = new Context($loop);
//$push = $context->getSocket(ZMQ::SOCKET_PUSH);
//$push->connect('tcp://127.0.0.1:5555');

// Setup our Ratchet ChatRoom application
$webSock = new Reactor($loop);
$webSock->listen(8080, '0.0.0.0');
$webServer = new IoServer(           // Basic I/O with clients, aww yeah
    new HttpServer(
        new WsServer(                    // Boom! WebSockets
//            new PortLogger($push, 8080,    // Compare vs the almost over 9000 conns
                new MessageLogger(       // Log events in case of "oh noes"
                    new SessionProvider(
                        new Authentication (
                            new ServerProtocol(  // WAMP; the new hotness sub-protocol
                                new Bot(         // People kept asking me if I was a bot, so I made one!
                                    new ChatRoom( // ...and DISCUSS!
                                        $app
                                    )
                                )
                            )
                            , $app['pdo']
                        )
                        , $app['session.storage.handler']
                    )
                    , $login
                    , $logout
                )
//            )
        )
    )
    , $webSock
);

// Allow Flash sockets (Internet Explorer) to connect to our app
$flashSock = new Reactor($loop);
$flashSock->listen(843, '0.0.0.0');
$policy = new FlashPolicy;
$policy->addAllowedAccess('*', 8080);
$webServer = new IoServer($policy, $flashSock);

//$logSock = new Reactor($loop);
//$logSock->listen(9000, '0.0.0.0');
//$zLogger = new IoServer(
//    new WsServer(
//        new PortLogger($push, 9000, new NullComponent)
//    )
//    , $logSock
//);

// GO GO GO!
$loop->run();
