var express = require('express');
var app = express();
var morgan = require('morgan');

app.use(morgan('combined'));
app.use(express.static(__dirname + '/public'));

var all_groups = [];

app.get('/api/queues', function (req, res) {
  res.set('Pragma', 'no-cache');
  res.set('Cache-Control', 'no-cache');
  res.send({groups: all_groups});
});

var port = parseInt(process.env['PORT']) || 3000

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

function getGroups() {
  var groups = [];
  ['Group One', 'Group Two', 'Group Three'].forEach(function (group_name) {
    var queues = [];
    ['Queue One', 'Queue Two', 'Queue Three'].forEach(function (queue_name) {
      var d = new Date();
      queues.push({name: queue_name, state: 'idle', ready: d.getTime() / 1000});
    });
    groups.push({name: group_name, queues: queues});
  });
  all_groups = groups;
  setTimeout(getGroups, 5000);
};

getGroups();
