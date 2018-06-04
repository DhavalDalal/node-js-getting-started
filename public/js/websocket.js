console.log(`WebSocket URL = ${websocketUrl}`);

function subscribe() {
  ws.send("subscribe");
}

function unsubscribe() {
  ws.send("unsubscribe");
}

function updateQuote(message) {
  var quoteMessage = JSON.parse(message);
  // stockQuotesViewModel.addOrUpdateQuote(quoteMessage);
};

const ws = new WebSocket(websocketUrl);

// event emmited when connected
ws.onopen = function (openMessage) {
  console.log(`websocket is connected...${openMessage}`)
  // sending a send event to websocket server
  ws.send('connected');
}
// event emmited when receiving message 
ws.onmessage = function (ev) {
  console.log(ev);
}    

ws.onclose = function(closeMessage){
  console.log(`Closed Connection: ${closeMessage}`);
}

ws.onerror = function(error) {
  console.log(`Error: ${error}`);
}
