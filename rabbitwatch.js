var express = require('express');
var app = express();
var morgan = require('morgan');
var http = require('http');

app.use(morgan('combined'));
app.use(express.static(__dirname + '/public'));

var group_configs = [
  {group_name: 'Performance', host: 'localhost', port: 15672, vhost: '/', user: 'guest', pass: 'guest', queue_names: ['hello.world.queue', 'tester.tester']},
  {group_name: 'Integration', host: 'localhost', port: 15672, vhost: '/', user: 'guest', pass: 'guest', queue_names: ['jenga.danube', 'danube.matador', 'danube.assetpublisher']}
];

var group_data = {};

app.get('/api/queues', function (req, res) {
  res.set('Pragma', 'no-cache');
  res.set('Cache-Control', 'no-cache');
  response = [];
  group_configs.forEach(function (group_config) {
    response.push(group_data[group_config.group_name]);
  });
  res.send({response: response});
});

var port = parseInt(process.env['PORT']) || 3000

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('rabbitwatch listening at http://%s:%s', host, port);
});

function getQueueData(host, port, vhost, user, pass, queue_names, cb) {
  options = {hostname: host, port: port, path: '/api/queues/' + encodeURIComponent(vhost), auth: user+':'+pass, headers: { 'Accept': 'application/json' }}
  http.get(options, function (res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    var response = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      console.log('BODY: ' + chunk);
      response += chunk;
    });
    res.on('end', function() {
      console.log('No more data in response.')
      var raw_data = JSON.parse(response)
      var queue_data = [];
      raw_data.forEach(function (data) {
        console.log('Q: ' + JSON.stringify(data));
        queue_names.forEach(function (queue_name) {
          if (data['name'] == queue_name) {
            queue_data.push({name: queue_name, state: data['state'], persistent: data['messages_persistent']});
          }
        });
      });
      cb(queue_data);
    });
  }).on('error', function(e) {
    console.log('ERROR for request to ' + host + ': ' + e.message);
    cb([]);
  });
}

function getGroupData(group_config) {
  getQueueData(group_config.host, group_config.port, group_config.vhost, group_config.user, group_config.pass, group_config.queue_names, function (queue_data) {
    group_data[group_config.group_name] = {name: group_config.group_name, queues: queue_data};
    setTimeout(getGroupData, 5000, group_config);
  });
};

group_configs.forEach(function (group_config) {
  getGroupData(group_config);
});
