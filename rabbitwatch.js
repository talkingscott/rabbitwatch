#!/usr/bin/env node
/*jslint node: true */
"use strict";

// node modules
var fs = require('fs');
var http = require('http');
var path = require('path');

// express and middleware modules
var express = require('express');
var app = express();
var morgan = require('morgan');
app.use(morgan('combined'));
app.use(express.static(__dirname + '/public'));

// configuration of servers/queues
var group_configs = [];

// per-server data about queues
var group_data = {};

// REST endpoint
app.get('/api/queues', function (ignore, res) {
    res.set('Pragma', 'no-cache');
    res.set('Cache-Control', 'no-cache');
    var response = [];
    group_configs.forEach(function (group_config) {
        response.push(group_data[group_config.group_name]);
    });
    res.send({response: response});
});

// Gets data about queues from one server using the RabbitMQ REST API
function getQueueData(host, port, vhost, user, pass, queue_names, cb) {
    var options = {hostname: host, port: port, path: '/api/queues/' + encodeURIComponent(vhost), auth: user + ':' + pass, headers: {Accept: 'application/json'}};
    http.get(options, function (res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
        var response = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            //console.log('BODY: ' + chunk);
            response += chunk;
        });
        res.on('end', function () {
            //console.log('No more data in response.');
            var raw_data = JSON.parse(response),
                queue_data = [];
            raw_data.forEach(function (data) {
                //console.log('Q: ' + JSON.stringify(data));
                queue_names.forEach(function (queue_name) {
                    var publish_rate,
                        deliver_rate,
                        ack_rate;
                    if (data.name === queue_name) {
                        if (data.hasOwnProperty('message_stats')) {
                            if (data.message_stats.hasOwnProperty('publish_details')) {
                                publish_rate = data.message_stats.publish_details.rate;
                            } else {
                                publish_rate = 0.0;
                            }
                            if (data.message_stats.hasOwnProperty('deliver_details')) {
                                deliver_rate = data.message_stats.deliver_details.rate;
                            } else {
                                deliver_rate = 0.0;
                            }
                            if (data.message_stats.hasOwnProperty('ack_details')) {
                                ack_rate = data.message_stats.ack_details.rate;
                            } else {
                                ack_rate = 0.0;
                            }
                        } else {
                            publish_rate = 0.0;
                            deliver_rate = 0.0;
                            ack_rate = 0.0;
                        }
                        queue_data.push({name: queue_name, state: data.state, total: data.messages, ready: data.messages_ready, unacknowledged: data.messages_unacknowledged, publish_rate: publish_rate, deliver_rate: deliver_rate, ack_rate: ack_rate});
                    }
                });
            });
            cb(queue_data);
        });
    }).on('error', function (e) {
        console.log('ERROR for request to ' + host + ': ' + e.message);
        cb([]);
    });
}

// Updates the data about queues for one group
// N.B. This schedules itself to run again in 5 seconds
function getGroupData(group_config) {
    var group_name = group_config.group_name,
        rabbitmq = group_config.rabbitmq;
    getQueueData(rabbitmq.host, rabbitmq.port, rabbitmq.vhost, rabbitmq.user, rabbitmq.pass, rabbitmq.queue_names, function (queue_data) {
        group_data[group_name] = {name: group_name, rabbitmq: {queues: queue_data}};
        setTimeout(getGroupData, 5000, group_config);
    });
}

// Start actually doing something by reading the group configuration file
var group_configs_filename = process.env.hasOwnProperty('GROUP_CONFIGS')
    ? process.env.GROUP_CONFIGS
    : path.join(__dirname, 'group_configs.json');
console.log('Read group configuration from ' + group_configs_filename);
fs.readFile(group_configs_filename, function (err, data) {
    if (err) {
        console.log('Error reading config file ' + group_configs_filename + ': ' + err);
    } else {
        group_configs = JSON.parse(data);
        // N.B. getGroupData schedules itself to run every 5 seconds
        group_configs.forEach(function (group_config) {
            getGroupData(group_config);
        });

        var port = process.env.hasOwnProperty('PORT')
                ? parseInt(process.env.PORT, 10)
                : 3000,
            server = app.listen(port, function () {
                var server_host = server.address().address,
                    server_port = server.address().port;

                console.log('rabbitwatch listening at http://%s:%s', server_host, server_port);
            });
    }
});
