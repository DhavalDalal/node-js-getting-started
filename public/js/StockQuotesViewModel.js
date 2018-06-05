StockQuotesViewModel = function() {
	this.quotes = ko.observableArray([]);
  this.changeStart = ko.observable();
  this.changeStop = ko.observable();
};

StockQuotesViewModel.prototype._find = function(quote) {
  return this.quotes().find(quoteViewModel => quoteViewModel.ticker() === quote.ticker);
};

StockQuotesViewModel.prototype.subscribe = function() {
  this.changeStart('disabled');
  this.changeStop(null); //Enable 
};

StockQuotesViewModel.prototype.unsubscribe = function() {
  this.changeStart(null); //Enable
  this.changeStop('disabled');
};

StockQuotesViewModel.prototype.addOrUpdateQuote = function(quote) {
	const curQuoteViewModel = new QuoteViewModel(quote.name, 
                    quote.ticker, 
										quote.low, 
										quote.high, 
										Number(quote.price).toFixed(2),
                    Number(0).toFixed(2));
  
	const oldQuoteViewModel = this._find(quote);
	if(oldQuoteViewModel === undefined) {
    this.quotes.push(curQuoteViewModel);
    //we don't extract out array and sort, KS provides sort() API to sort this observableArray 
    this.quotes.sort((left, right) => left.ticker() == right.ticker() ? 0 : (left.ticker() < right.ticker() ? -1 : 1)); 
	} else {
		const oldPrice = oldQuoteViewModel.price(); 
		const currentPrice = Number(quote.price).toFixed(2);
    curQuoteViewModel.change(Number((oldPrice - currentPrice) * -1).toFixed(2));
    this.quotes.replace(oldQuoteViewModel, curQuoteViewModel);
		this._updateChangeClasses(curQuoteViewModel, oldPrice, currentPrice);
	}
};

StockQuotesViewModel.prototype._updateChangeClasses = function(quoteViewModel, oldPrice, currentPrice) {
	if(oldPrice > currentPrice) {
		quoteViewModel.changeColor('danger');
    quoteViewModel.changeDirection('glyphicon glyphicon-arrow-down');
		return;
	}
	 
	if(oldPrice < currentPrice) {
		quoteViewModel.changeColor('success');
		quoteViewModel.changeDirection('glyphicon glyphicon-arrow-up');
		return;
	} 
	
	if(oldPrice === currentPrice) {
    quoteViewModel.changeColor('');
		quoteViewModel.changeDirection('');
		return;
	} 
};

