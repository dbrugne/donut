<?php
namespace Server\Components;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\WebSocket\WsServerInterface;
use Monolog\Logger;

/**
 * A Ratchet component that wraps Monolog loggers tracking received messages
 */
class MessageLogger implements MessageComponentInterface, WsServerInterface {
    /**
     * @var Logger|null
     */
    protected $_logger;

    /**
     * @var MessageComponentInterface|null
     */
    protected $_component;

    /**
     * Counts the number of open connections
     * @var int
     */
    protected $_i = 0;

    public function __construct(MessageComponentInterface $component = null, Logger $incoming = null) {
        $this->_component = $component;
        $this->_logger        = $incoming;
    }

    /**
     * {@inheritdoc}
     */
    function onOpen(ConnectionInterface $conn) {
        $this->_i++;

        if (null !== $this->_logger) {
            $this->_logger->addInfo('onOpen', array('#open' => $this->_i, 'id' => $conn->resourceId, 'ip' => $conn->remoteAddress));
        }

        $this->_component->onOpen($conn);
    }

    /**
     * {@inheritdoc}
     */
    public function onMessage(ConnectionInterface $from, $msg) {
        if (null !== $this->_logger) {
            $this->_logger->addInfo('onMsg', array('from' => $from->resourceId, 'len' => strlen($msg), 'msg' => $msg));
        }

        $this->_component->onMessage($from, $msg);
    }

    /**
     * {@inheritdoc}
     */
    public function onClose(ConnectionInterface $conn) {
        $this->_i--;

        if (null !== $this->_logger) {
            $this->_logger->addInfo('onClose', array('#open' => $this->_i, 'id' => $conn->resourceId));
        }

        $this->_component->onClose($conn);
    }

    /**
     * {@inheritdoc}
     */
    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->_logger->addError("onError: ({$e->getCode()}): {$e->getMessage()}", array('id' => $conn->resourceId, 'file' => $e->getFile(), 'line' => $e->getLine()));

        $this->_component->onError($conn, $e);
    }

    /**
     * {@inheritdoc}
     */
    public function getSubProtocols() {
        if ($this->_component instanceof WsServerInterface) {
            return $this->_component->getSubProtocols();
        } else {
            return array();
        }
    }
}