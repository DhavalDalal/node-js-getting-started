console.log(`WebSocket URL = ${websocketUrl}`);

function toggleSubscription() {
  stockQuotesViewModel.toggleStartStop(state => {
    if (state === 'start') 
      ws.send("subscribe");
    if (state === 'stop')    
      ws.send("unsubscribe");    
  });
}

function updateQuote(quoteJson) {
  console.log("Updating Quote..." + quoteJson);
  stockQuotesViewModel.addOrUpdateQuote(quoteJson);
};

const ws = new WebSocket(websocketUrl);

// event emmited when connected
ws.onopen = function (openMessage) {
  console.log(`websocket is connected...${openMessage}`)
  // sending a send event to websocket server
  ws.send('client ready for communication...');
}

// event emmited when receiving message 
ws.onmessage = function (message) {
  try {
    const quoteMessage = JSON.parse(message.data);
    if (quoteMessage.ticker)
      updateQuote(quoteMessage);
    else 
      console.log(message.data);
  } catch(e) {
    console.error(`Could Not update quote: ${message.data}`);
    console.error(`Problem => ${e}`);
  }
}    

ws.onclose = function(closeMessage){
  console.log(`Closed Connection: ${closeMessage}`);
}

ws.onerror = function(error) {
  console.log(`Error: ${error}`);
}
