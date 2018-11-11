const url = require('url');
const path = require('path');
const WebSocketServer = require('ws').Server;
const marketdata = require('./marketdata');

function getUniqueID() {
	const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	return s4() + s4() + '-' + s4();
};

function hasSubscription(ws) {
	return ws.subscription !== undefined;
}

function unsubscribeAndRemoveSubscriptionIfPresent(ws) {
	if (hasSubscription(ws)) {
		ws.subscription.unsubscribe();
  	console.log(`client [${ws.id}]: Unsubscribed`);
		delete ws.subscription;
	}
}

function sendMessageToClient(ws, stringifiedMsgJson) {
	console.log(`server => client [${ws.id}]: ${stringifiedMsgJson}`);
	ws.send(stringifiedMsgJson);
}

function showConnectedClientsStats(wss) {
	//wss.clients is a Set of client websocket connections
	console.log("================<< CONNECTED CLIENT STATS >>====================");
	console.log(`Total Clients connected => ${wss.clients.size}.  See the list below:`);
	Array.from(wss.clients).forEach((client, idx) => console.log(`${idx + 1}. ${client.id}`));
	console.log("==============<< END CONNECTED CLIENT STATS >>==================");
}

function subscribeToMarketData(ws, ticker) {
	const marketDataObservable = (ticker === 'realtime') ?
		marketdata.streamAllTickerPrices() : marketdata.streamTickerPriceFor(ticker);
 	sendMessageToClient(ws, `{ "ack" : "Subscribing to market data for receiving...${(ticker === 'realtime') ? 'all' : ticker} prices."}`);
	//Attach subscription to ws connection
	ws.subscription = marketDataObservable.subscribe(
		stock => sendMessageToClient(ws, JSON.stringify(stock)), 
		error => sendMessageToClient(ws, `{ "error" : "${error.message}" }`));
}

module.exports = {
	start: function(config) {
		// initialize the WebSocket server instance
		const wss = new WebSocketServer(config);

		wss.on('connection', (ws, req) => {
			ws.id = getUniqueID();
			showConnectedClientsStats(wss);
			console.log(`Req for new connection accepted, clientId => ${ws.id}`);
			const reqURL = url.parse(req.url, true);
			console.log(`Path = ${reqURL.pathname}`);
			//connection is up, let's add a simple simple event
			ws.on('message', message => {
				console.log(`client [${ws.id}] => server: ${message}`);
				try {
				  const {command, args} = JSON.parse(message);
   				  if (command === 'echo') {
					  sendMessageToClient(ws, `{ "ack" : ${JSON.stringify(args)}}`);
					  return; 
				  }
  				  if (command === 'subscribe') {
  					if (hasSubscription(ws)) {
  					  sendMessageToClient(ws, `{ "error" : "Cannot Subscribe again...already subscribed!" }`);
  					  return;
  					}
  					console.log(`Path = ${reqURL.pathname}`);
  					// console.log(`Path Basename  = ${path.basename(reqURL.pathname)}`);
  					let ticker = path.basename(reqURL.pathname);
  					subscribeToMarketData(ws, ticker);
  					return;
  				  }

  				  if (command === 'unsubscribe') {
  					unsubscribeAndRemoveSubscriptionIfPresent(ws);
  					sendMessageToClient(ws, `{ "ack" : "Unsubscribed."}`);
  					return;
  				  }
				} catch (e) {
				  sendMessageToClient(ws, `{ "error" : "Send command as stringified JSON. Format \{ 'command': 'xxx', 'args': [arg1, arg2, ...] \} or \{ 'command': 'xxx' \}.`);
				  console.debug(`Problem => ${e}`);
				}
			});

			ws.on('close', closeMessage => {
				unsubscribeAndRemoveSubscriptionIfPresent(ws);
				console.log(`client [${ws.id}] closed: ${closeMessage}`);
			});

			//send immediately a feedback to the incoming connection
			sendMessageToClient(ws, `{ "ack" : "You are connected with Id [${ws.id}] to the National Stock Prices Realtime Service!"}`);
			// sendMessageToClient(ws, `{ "message" : "client to send message - \{ 'command': 'subscribe' \} to get realtime prices and to stop receiving updates send message - \{ 'command': 'unsubscribe' \} }`);
		});
	}
}
