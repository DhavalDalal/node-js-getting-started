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
		ws.subscription.dispose();
		delete ws.subscription;
	}
}

function sendMessageToClient(ws, stringifiedMsgJson) {
	console.log(`server => client [${ws.id}]: ${stringifiedMsgJson}`);
	ws.send(stringifiedMsgJson);
}

function listAllConnectedClients(wss) {
	//wss.clients is a Set of client websocket connections
	console.log(`Total Clients connected => ${wss.clients.size}.  See the list below:`);
	Array.from(wss.clients).forEach((client, idx) => console.log(idx + 1, client.id));
}

function subscribeToMarketData(ws, ticker) {
	const marketDataObservable = (ticker === 'realtime') ?
		marketdata.streamAllTickerPrices() : marketdata.streamTickerPriceFor(ticker);
	const subscribeAckMessage = `{ "ack" : "Subscribing to market data for receiving...${(ticker === 'realtime') ? 'all' : ticker} prices."}`;
	sendMessageToClient(ws, subscribeAckMessage);
	//Attach subscription to ws connection
	ws.subscription = marketDataObservable.subscribe(stock => {
		const data = JSON.stringify(stock);
		sendMessageToClient(ws, data);
	}, error => {
		const errorMessage = `{ "error" : "${error.message}" }`;
		sendMessageToClient(ws, errorMessage);
	});
}

module.exports = {
	start: function(config) {
		// initialize the WebSocket server instance
		const wss = new WebSocketServer(config);

		wss.on('connection', (ws, req) => {
			ws.id = getUniqueID();
			listAllConnectedClients(wss);
			console.log(`Req for new connection accepted, clientId => ${ws.id}`);
			const reqURL = url.parse(req.url, true);
			console.log(`Path = ${reqURL.pathname}`);
			//connection is up, let's add a simple simple event
			ws.on('message', message => {
				console.log(`client [${ws.id}] => server: ${message}`);
				if (message === 'subscribe') {
					if (hasSubscription(ws)) {
						const alreadySubscribedMessage = `{ "error" : "Cannot Subscribe again...already subscribed!" }`;
						sendMessageToClient(ws, alreadySubscribedMessage);
						return;
					}
					console.log(`Path = ${reqURL.pathname}`);
					// console.log(`Path Basename  = ${path.basename(reqURL.pathname)}`);
					let ticker = path.basename(reqURL.pathname);
					subscribeToMarketData(ws, ticker);
					return;
				}

				if (message === 'unsubscribe') {
					unsubscribeAndRemoveSubscriptionIfPresent(ws);
					const unsubscribeAckMessage = `{ "ack" : "Unsubscribed."}`;
					sendMessageToClient(ws, unsubscribeAckMessage);
					return;
				}
			});

			ws.on('close', closeMessage => {
				unsubscribeAndRemoveSubscriptionIfPresent(ws);
				console.log(`client [${ws.id}] closed: ${closeMessage}`);
			});

			//send immediately a feedback to the incoming connection
			sendMessageToClient(ws, `{ "ack" : "You are connected with Id [${ws.id}] to the National Stock Prices Realtime Service!"}`);
			sendMessageToClient(ws, '{ "message" : "Press >> Start << to get realtime prices..." }');
		});
	}
}
