var sys = require("sys"),
	fs = require("fs"),
	path = require("path"),
	http = require("http"),
	ws = require('./lib/ws');


function log(msg) { sys.puts(msg.toString()); };

var players=[0,0];

var maxplayers= 2;

//////////////////////////////////////////////////////////

var httpServer = http.createServer(serveFile);
var server = ws.createServer({ debug: false }, httpServer);

server.addListener("listening", function()
{
	log("****** PONG Server started! *******");
});

server.addListener("connection", function(conn)
{
	if (getNumPlayers()>=maxplayers) 
	{
		log("New player failed (4 players online)")
		server.send(conn.id, 'full');
		conn.close();
	}
	
	var playerid= addNewPlayer(conn.id);

	log(getNumPlayers()+' players online!');
	server.send(conn.id, 'ok#'+playerid);
	conn.broadcast('join#'+conn.id);
	
	if (getNumPlayers()==maxplayers) startGame(conn);
	
	conn.addListener("message", function(message)
	{
		var c= message.split('#');
		switch(c[0])
		{
			case 'pos': conn.broadcast('pos#'+conn.id+'#'+c[1]);
			break;
			case 'fail': startGame(conn);
			break;
		}
//		conn.broadcast(conn.id+'#'+message);
	});
});

server.addListener("close", function(conn)
{
	for (var i in players) if (players[i]==conn.id){ players[i]=0; break;}
	log("Player exits. "+getNumPlayers()+' remain online.');
	conn.broadcast('off#'+conn.id);
});

server.listen(8888);
///////////////////////////////////////////////////////

function getNumPlayers()
{
	var num=0;
	for (var i in players) if (players[i]!=0) num++;
	return num;
}


function addNewPlayer(connid)
{
	for (var i in players) if (players[i]==0) { players[i]= connid; return i;};
	return -1;
}

function startGame(conn)
{
	if (getNumPlayers()!=maxplayers) return;
	var angle= Math.random()*Math.PI*2;
	server.send(conn.id, 'start#'+angle)
	conn.broadcast('start#'+angle)
}
///////////////////////////////////////////////////////

function serveFile(req, res)
{
	if( req.url.indexOf("favicon") > -1 ){
		res.writeHead(200, {'Content-Type': 'image/x-icon', 'Connection': 'close', 'Content-Length': '0'});
		res.end('');
	} 
	else {
		res.writeHead(200, {'Content-Type': 'text/html'});
		fs.createReadStream( path.normalize(path.join(__dirname, "pong.html")), {
		  'flags': 'r', 'encoding': 'binary', 'mode': 0666, 'bufferSize': 4 * 1024 })
		.addListener("data", function(chunk){ res.write(chunk, 'binary'); })
		.addListener("close",function() { res.end(); });
	}
};

// Handle HTTP Requests:

// This will hijack the http server, if the httpserver doesn't 
// already respond to http.Server#request

// server.addListener("request", serveFile);
