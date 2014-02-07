<?php
namespace Server\Components;
use Ratchet\ConnectionInterface;

class ConnectionStub implements ConnectionInterface {
    protected $onSend;
    protected $onClose;
    public $User;

    public function __construct(\Closure $onSend = null, \Closure $onClose = null) {
        $this->User = new \StdClass;
        $this->User->id = 0;
        $this->User->username = 'Bot user';
        $this->setSendCallback($onSend);
        $this->setCloseCallback($onClose);
    }

    public function setSendCallback(\Closure $onSend = null) {
        $this->onSend = $onSend;
    }

    public function setCloseCallback(\Closure $onClose = null) {
        $this->onClose = $onClose;
    }

    public function send($msg) {
        if (null !== $this->onSend) {
            $cb = $this->onSend;
            $cb($msg);
        }
    }

    public function close() {
        if (null !== $this->onClose) {
            $cb = $this->onClose;
            $cb();
        }
    }
}
