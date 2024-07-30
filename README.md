# jemena-mqtt
Scrapes usage metrics from Jemena and publishes over MQTT

## Topics

Emits `{prefix}/today` and `{prefix}/latest` with number data for today's running kWh usage, or latest kW per hour rate.

## Running

It is intended to be installed globally, ie `npm i -g jemena-mqtt`

Create a YAML file somewhere. See `config.example.yml`

Run (replace path)

```
CONFIG_PATH=./config.yml sunljemenaight-mqtt
```

You can also use Consul for config. See [mqtt-usvc](https://www.npmjs.com/package/mqtt-usvc) for more details.

## Example Config

```
mqtt:
  uri: mqtt://localhost
  prefix: jemena
service:
  jemena_username: me@example.com
  jemena_password: secret123
  poll_interval: 1800000
```

## HTTP Status Endpoint

Add port to config:

```
mqtt:
  uri: mqtt://localhost
  prefix: jemena
http:
  port: 9876
service:
  jemena_username: me@example.com
  jemena_password: secret123
  poll_interval: 1800000
```

Then request `http://localhost:9876/status`

Metrics coming soon.
