QuoteViewModel = function(name, ticker, low, high, price, change) {
  this.name = ko.observable(name);
  this.ticker = ko.observable(ticker);
  this.low = ko.observable(low);
  this.high = ko.observable(high);
  this.price = ko.observable(Number(price));
  this.change = ko.observable(Number(change));
  this.changeDirection = ko.observable();
  this.changeColor = ko.observable();
};