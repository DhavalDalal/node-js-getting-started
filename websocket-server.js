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


module.exports = {
  start: function(config){
    // initialize the WebSocket server instance
    const wss = new WebSocketServer(config);

    wss.on('connection', (ws, req) => {
        ws.id = getUniqueID();
        console.log(`Req for new connection accepted, clientId => ${ws.id}`);
        //wss.clients is a Set of client websocket connections
        console.log(`Total Clients connected => ${wss.clients.size}.  See the list below:`);
        Array.from(wss.clients).forEach((client, idx) => console.log(idx + 1, client.id));
        const reqURL = url.parse(req.url, true);
        console.log(`Path = ${reqURL.pathname}`);
        //connection is up, let's add a simple simple event
        ws.on('message', message => {
          console.log(`client [${ws.id}] => server: ${message}`);
          if (message === 'subscribe') {
            if (hasSubscription(ws)) {
              const alreadySubscribedMessage = `{ "error" : "Cannot Subscribe again...already subscribed!" }`;
              console.error(`server => client [${ws.id}]: ${alreadySubscribedMessage}`);
              ws.send(alreadySubscribedMessage);
              return;
            }
        
            console.log(`Path = ${reqURL.pathname}`);
            console.log(`Path Basename  = ${path.basename(reqURL.pathname)}`);
            let ticker = path.basename(reqURL.pathname);
            const marketDataObservable = (ticker === 'realtime') ? 
                    marketdata.streamAllTickerPrices() : marketdata.streamTickerPriceFor(ticker);
            const subscribingMessage = `{ "ack" : "Subscribing to receiving...${(ticker === 'realtime') ? 'all' : ticker} prices."}`; 
            ws.send(subscribingMessage);
            ws.subscription = marketDataObservable.subscribe(stock => {
              const data = JSON.stringify(stock);
              console.log(`server => client [${ws.id}]: ${data}`);
              ws.send(data);
            }, error => {
              const errorMessage = `{ "error" : "${error.message}" }`;
              console.error(`server => client [${ws.id}]: ${errorMessage}`);
              ws.send(errorMessage);
            });
            return;
          }

          if (message === 'unsubscribe') {
            console.log(`unsubscribing client [${ws.id}]...`);
            if (hasSubscription(ws)) {
              ws.subscription.dispose();
              delete ws.subscription;
            }
            console.log(`Unsubscribed client [${ws.id}]`);
            const unsubscribingMessage = `{ "ack" : "Unsubscribed."}`; 
            ws.send(unsubscribingMessage);
            return;
          }
        });

        ws.on('close', closeMessage => {
          if (hasSubscription(ws)) {
            ws.subscription.dispose();
            delete ws.subscription;
          } 
          console.log(`client [${ws.id}] closed: ${closeMessage}`);
        });
    
        //send immediately a feedback to the incoming connection
        console.log(`client connected! clientId => [${ws.id}]`);
        ws.send('{ "ack" : "You are connected to National Stock Prices Realtime Service!"}');
        ws.send('{ "message" : "Press >> Start Updates << to get realtime prices..." }');
    });
  }
}
