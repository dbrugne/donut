<?php

namespace App\Orm;

abstract class Entity
{
    /** @var array */
    protected $data = array();

    /**
     * Return the current data array.
     *
     * @return array
     */
    public function getData()
    {
        return $this->data;
    }

    /**
     * Validate the current entity.
     *
     * @return array An array of error messages, or an ampty array if there were no errors.
     */
    public function validate()
    {
        return array();
    }

    /**
     * Magic method to implement dynamic accessors
     *
     * @param $name
     * @param $arguments
     * @return bool
     */
    public function __call($name, $arguments)
    {
        $action = substr($name, 0, 3);
        switch ($action)
        {
            case 'get':
                $property = $this->undescorize(substr($name, 3));
                return (isset($this->data[$property])) ? $this->data[$property] : null;
                break;

            case 'set':
                $property = $this->undescorize(substr($name, 3));
                $this->data[$property] = $arguments[0];
                break;

            default :
                throw new \Exception("Unknown method '{$name}' called on " . __CLASS__);
        }
    }

    /**
     * Un-camelcased a string, for example:
     *
     * UserId = user_id
     *
     * @param $string
     * @return mixed
     */
    protected function undescorize($string)
    {
        $string[0] = strtolower($string[0]);
        $string = strtolower(preg_replace('/(.)([A-Z])/', "$1_$2", $string));
        return $string;
    }

} 