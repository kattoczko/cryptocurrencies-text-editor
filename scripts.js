var cryptocurrenciesTextEditor = (function() {
  const apiEndpoint = "https://api.coinpaprika.com/v1/";
  const textArea = document.getElementById("textArea");
  const convertedText = document.getElementById("convertedText");
  const debouncedUpdateCurrencyCache = _.debounce(
    updateCurrencyCache, // could define this function inside and rename the parent to updateCurrencyCache
    600
  );
  const currencyCache = [];
  const availableFunctionNames = ["Name", "Price"];
  const matches = []; // CONST FFS. also, please move this definition so that it's right below foundCurrencies
  const functions = {
    //rename to availableFunctions for consistency
    updateName: updateName, // consider making this a module with these functions defined within
    updatePrice: updatePrice
  };

  function updateOutputText(event) {
    const value = event.target.value;
    debouncedUpdateCurrencyCache(value);
    if (currencyCache.length > 0) {
      convertText(value);
    }
  }

  function updateMatches(text) {
    availableFunctionNames.forEach(functionName => {
      const regx = new RegExp(`{{ (${functionName})\/\\w+ }}`, "g");
      const newMatches = text.match(regx) || [];
      matches.push(...newMatches);
    });
  }

  function getAttributeNameAndSymbolPair(regExpMatch) {
    const pair = regExpMatch.replace(/({{ | }})/g, "").split("/"); //rename to functionSymbolPair
    const attributeName = pair[0].toLowerCase();
    const symbol = pair[1];

    return { attributeName, symbol };
  }

  function updateCurrencyCache(text) {
    updateMatches(text);
    let shouldFetchNewData = false;

    if (matches) {
      matches.map(match => {
        const { attributeName, symbol } = getAttributeNameAndSymbolPair(match);
        const currency = currencyCache.find(currency => {
          return currency.symbol === symbol;
        });

        if (currency) {
          if (!currency[attributeName]) {
            currency[attributeName] = null;
            shouldFetchNewData = true;
          }
        } else {
          const newFoundMatch = {
            ["symbol"]: symbol,
            [attributeName]: null
          };
          currencyCache.push(newFoundMatch);
          shouldFetchNewData = true;
        }
      });

      console.log(currencyCache);
      if (shouldFetchNewData) {
        fetchNewDataForCurrencyCache().then(() => {
          convertText(text);
        });
      }
    }
  }

  function fetchNewDataForCurrencyCache() {
    return Promise.all(
      currencyCache.map(async currency => {
        for (var prop in currency) {
          if (!currency[prop]) {
            const functionName =
              "update" + prop.charAt(0).toUpperCase() + prop.slice(1); //change to update
            return await functions[functionName](currency);
          }
        }
      })
    );
  }

  function convertText(textToConvert) {
    let textWithReplacedMatches = textToConvert;

    if (matches) {
      matches.forEach(match => {
        const { attributeName, symbol } = getAttributeNameAndSymbolPair(match);
        const currency = currencyCache.find(currency => {
          return currency.symbol === symbol;
        });
        const validAttributeExists =
          currency[attributeName] && currency[attributeName] !== "invalid";

        if (validAttributeExists) {
          textWithReplacedMatches = textWithReplacedMatches.replace(
            match,
            currency[attributeName]
          );
        }
      });
    }

    convertedText.innerText = textWithReplacedMatches;
  }

  function updateName(currency) {
    return axios
      .get(`${apiEndpoint}search/?q=${currency.symbol}&modifier=symbol_search`)
      .then(res => {
        const currencyData = res.data.currencies.find(item => {
          return item.symbol === currency.symbol;
        });

        if (currencyData) {
          currency.name = currencyData.name;
          currency.id = currencyData.id;
        } else {
          currency.name = "invalid";
          currency.id = "invalid";
        }
      });
  }

  async function updatePrice(currency) {
    if (!currency.id) {
      await updateName(currency);
    }

    if (currency.id !== "invalid") {
      return axios.get(`${apiEndpoint}tickers/${currency.id}`).then(res => {
        const price = res.data.quotes.USD.price;

        if (price) {
          currency.price = price;
        } else {
          currency.price = "invalid";
        }
      });
    }
  }

  function init() {
    textArea.oninput = updateOutputText;
  }

  return {
    init: init
  };
})();

cryptocurrenciesTextEditor.init();
