const rx = require('rx');

// console.log(`Market Data...`);

const STOCKS = [
	{ticker: 'AAPL', name: 'Apple Inc.', low: 30.35, high: 60.45, tickMillis : { low: 2000, high: 4000 }},
	{ticker: 'GOOG', name: 'Google Inc.', low: 90.67, high: 160.34, tickMillis : { low: 1000, high: 2000 }},
	{ticker: 'MSFT', name: 'Microsoft Inc.', low: 20.56, high: 40.23, tickMillis : { low: 3000, high: 7000 }},
	{ticker: 'ORCL', name: 'Oracle Inc.', low: 50.10, high: 90.19, tickMillis : { low: 4000, high: 10000 }},
];

const randomNumberBetween = function(min, max, decimalPlaces = 0) {
  // return Math.floor(Math.random() * (max - min + 1) + min);
	// return decimal value
	let decimalValue = (Math.random() * (max - min)) + min;
  if (decimalPlaces === 0) 
    return Number.parseInt(decimalValue.toFixed(decimalPlaces));
  else
    return Number.parseFloat(decimalValue.toFixed(decimalPlaces));
}

module.exports = {
  getAllTickerPrices : function() {
    return STOCKS.map(stock => {
    		  stock.price = randomNumberBetween(stock.low, stock.high, 2);
    		  return stock;
    });
  },
  getTickerPriceFor: function(ticker) {
	  const found = this.getAllTickerPrices().filter(stock => stock.ticker === ticker)[0];
	  if (found) 
		  return found;
	  else
      throw new Error(`Ticker ${ticker} Not found!`);
  },
  streamTickerPriceFor: function(ticker) {
    console.log(`streamTickerPriceFor(${ticker})`);
    try {
      const stock = this.getTickerPriceFor(ticker);
      return rx.Observable.generateWithRelativeTime(stock,
           w => true, // don't terminate
           stock => { 
             stock.price = randomNumberBetween(stock.low, stock.high, 2); 
             return stock;
           },  // next function
           stock => stock,    // return value
           () => randomNumberBetween(stock.tickMillis.low, stock.tickMillis.high) // tick every millis
         )
    } catch (e) {
      return rx.Observable.throw(e);
    }
  },
  streamAllTickerPrices: function(){
    console.log(`streamAllTickerPrices()`);
    return STOCKS.map(stock => this.streamTickerPriceFor(stock.ticker)).reduce((o1, o2) => o1.merge(o2));
  }
}


