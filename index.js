const express = require('express')
const path = require('path');
const url = require('url');
const marketdata = require('./marketdata');

function sendJson(response, statusCode, object) {
  response.setHeader('Content-Type', 'application/json');
  response.status(statusCode);  
  response.send(JSON.stringify(object));
}

function sendErrorJson(response, statusCode, errMessage) {
	sendJson(response, statusCode, { error: errMessage });
}

function isSecure(req){
  return req.headers['x-forwarded-proto'] === 'https';
}

function useSecureProtocolIfRequired(req, protocol) {
  if (protocol === undefined) {
    return req.protocol;
  }
  return isSecure(req) ? protocol.replace(':', 's:') : protocol;
  console.log(`Modified Protocol = ${modifiedProtocol}`);
}

function fullUrl(req, protocol) {
  return url.format({
    protocol: useSecureProtocolIfRequired(req, protocol),
    host: req.get('host'),
    pathname: req.originalUrl,
    slashes:true
  });
}

let app = express()
  .use(express.static(__dirname + '/public'))
  //This is important for /public to work in links and script tags
  .use('/public',  express.static(__dirname + '/public')) 
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => {
    res.render('pages/index', {
      req: fullUrl(req), 
      realtimeReq: fullUrl(req, 'ws:')
    });
  })
	//   .post('/stocks', (req, res) => {
	//   	console.info("Posting a new ticker", req.route.stack);
	// var stock = {ticker: req.params.ticker, name: req.params.name};
	// sendJson(res, 200, stock);
	//   })
  .get('/stocks', (req, res) => {
	  console.info("Got req for all ticker prices...");
	  sendJson(res, 200, marketdata.getAllTickerPrices());
  })
  .get('/stocks/realtime', (req, res) => {
 	   console.info("Got Realtime req for all ticker prices...");
     res.render('pages/realtime', {
       req: fullUrl(req), 
       realtimeReq: fullUrl(req, 'ws:')
     });
   })
   .get('/stocks/realtime/:ticker', (req, res) => {
 	  let ticker = req.params.ticker;
     console.info(`Got Realtime req for ${ticker}...`);
     res.render('pages/realtime', {
       req: fullUrl(req), 
       realtimeReq: fullUrl(req, 'ws:')
     });
   })
  .get('/stocks/:ticker', (req, res) => {
	  let ticker = req.params.ticker;
	  console.info(`Got req for ${ticker}...`);
    try {
      let found = marketdata.getTickerPriceFor(ticker);
      sendJson(res, 200, found);
    } catch(e) {
		  sendErrorJson(res, 404, e.message);    
    }
  })
  .get('/simulateException', (req, res, next) => {
	  const error = new Error('Oops! Something went wrong');
  	console.error("Simulating Server Fail by Exception...", error);
	  // throw new Error('Oops! Something went wrong');
	  sendErrorJson(res, 503, error.message);
  });
  
const http = require('http');
const httpServer = http.createServer();

// Mount the app here
httpServer.on('request', app);
const WebSocketServer = require('ws').Server;
  
// initialize the WebSocket server instance
const wss = new WebSocketServer({
  server : httpServer
});

wss.getUniqueID = function () {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};

function hasSubscription(ws) {
  return ws.subscription !== undefined;
}

wss.on('connection', (ws, req) => {
    ws.id = wss.getUniqueID();
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

const PORT = process.env.PORT || 5000
// Let us start our server
httpServer.listen(PORT, () => console.log(`Listening on ${ PORT }`));

exports.stop = function stop() {
	httpServer.close(() => console.log(`Shutdown server...`));
}
