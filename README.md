# rabbitwatch
Watch multiple RabbitMQ servers

## getting started

* clone this repository
* run npm install
* change directory to public
* run bower install
* change directory up
* edit group_configs.json
* run node rabbitwatch.js
* point your browser to localhost:3000
 
## environment variables

* PORT sets the port the HTTP server will listen on (default 3000)
* GROUP_CONFIGS sets the filename for the group configuration file (default group_configs.json in the root directory)

## configuration

The group configuration file specifies the RabbitMQ server information, including the names of which queues to watch on each.  Each group is a set of queues on a single server.  Each group is displayed in its own table in the browser.  Currently, the queues on a server can be split into any number of groups, but all queues in a group must come from a single server.  At its simplest, each group will be all the queues of interest on a single server.  The group concept allows those queues to be further sub-divided into groups based on, say, the application that uses them.

The group configuration is specified as a JSON array.  Each group has a name property, a set of properties that specify the information required to make a RabbitMQ REST API call to the server, and a queue_names array that is, shockingly, the list of queue names to watch.

The group_configs.json file in the repo should be your guide.
