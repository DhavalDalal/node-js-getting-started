StockQuotesViewModel = function() {
	this.quotes = ko.observableArray([]);
	this.toggleButtonText = ko.observable();
	this.toggleButton = ko.observable();
	this.toggleButtonGlyphicon = ko.observable();
	this.toggleButtonState = 'stop';
	this._setToggleButtonToStart();
};

StockQuotesViewModel.prototype._find = function(quote) {
	return this.quotes().find(quoteViewModel => quoteViewModel.ticker() === quote.ticker);
};

StockQuotesViewModel.prototype._setToggleButtonToStart = function() {
	this.toggleButtonState = 'start';
	this.toggleButtonText(" Subscribe");
	this.toggleButton("btn btn-lg btn-success");
	this.toggleButtonGlyphicon("glyphicon glyphicon-play-circle pull-left");
};

StockQuotesViewModel.prototype._setToggleButtonToStop = function() {
	this.toggleButtonState = 'stop';
	this.toggleButtonText(" Unsubscribe");
	this.toggleButton("btn btn-lg btn-danger");
	this.toggleButtonGlyphicon("glyphicon glyphicon-off pull-left");
};

StockQuotesViewModel.prototype.toggleStartStop = function(cb) {
	cb(this.toggleButtonState);
	if (this.toggleButtonState === 'start') {
		this._setToggleButtonToStop();
		return;
	}
	if (this.toggleButtonState === 'stop') {
		this._setToggleButtonToStart();
		return;
	}
};

StockQuotesViewModel.prototype.addOrUpdateQuote = function(quote) {
	const curQuoteViewModel = new QuoteViewModel(quote.name,
		quote.ticker,
		quote.low,
		quote.high,
		Number(quote.price).toFixed(2),
		Number(0).toFixed(2));

	const oldQuoteViewModel = this._find(quote);
	if (oldQuoteViewModel === undefined) {
		this.quotes.push(curQuoteViewModel);
		//we don't extract out array and sort, KS provides sort() API to sort this observableArray 
		this.quotes.sort((left, right) => left.ticker() == right.ticker() ? 0 : (left.ticker() < right.ticker() ? -1 : 1));
	} else {
		const oldPrice = oldQuoteViewModel.price();
		const currentPrice = Number(quote.price).toFixed(2);
		curQuoteViewModel.updateChange(oldPrice);
		this.quotes.replace(oldQuoteViewModel, curQuoteViewModel);
	}
};

StockQuotesViewModel.prototype.showError = function (errorJson) {
	$('#toggleSubscriptionButton')
	  .replaceWith(`<div class="alert alert-danger"><strong>Failure => ${errorJson.error}</strong></div>`)
};
