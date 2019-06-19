var cryptoCurrenciesTextEditor = (function() {
  const apiEndpoint = "https://api.coinpaprika.com/v1/";
  const textArea = document.getElementById("textArea");
  const convertedText = document.getElementById("convertedText");
  const errorMessageElement = document.getElementById("errorMessage");
  const currencyCache = [];
  const availableMethods = initAvailableMethods(); // zmienić init na get?
  const updateCurrencyCache = initUpdateCurrencyCache();
  let matches = [];

  return {
    init: init
  };

  function init() {
    textArea.oninput = updateOutputText;
  }

  function updateOutputText(event) {
    const value = event.target.value;
    if (currencyCache.length > 0) {
      convertText(value);
    }
    if (value === "") {
      clearErrorMessage();
    }
    updateCurrencyCache(value);
    console.log(currencyCache);
  }

  function initUpdateCurrencyCache() {
    return _.debounce(
      updateCurrencyCache, // could define this function inside and rename the parent to updateCurrencyCache
      600,
      { leading: false, maxWait: 200 }
    );

    function updateCurrencyCache(text) {
      updateMatches(text);
      let shouldFetchNewData = false;

      if (matches) {
        matches.map(match => {
          const { attributeName, symbol } = getMatchParameters(match);
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
            showErrors(text);
          });
        } else {
          showErrors(text);
        }
      }
    }
  }

  function initAvailableMethods() {
    return {
      Name: updateBasicInfo, // consider making this a module with these functions defined within
      Price: updatePrice
    };

    function updateBasicInfo(currency) {
      return axios
        .get(
          `${apiEndpoint}search/?q=${currency.symbol}&modifier=symbol_search`
        )
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
        await updateBasicInfo(currency);
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
      } else {
        currency.price = "invalid";
      }
    }
  }

  function updateMatches(text) {
    console.log("matches", matches);
    const methodNames = Object.keys(availableMethods);
    let newMatches = [];
    methodNames.forEach(methodName => {
      const regx = new RegExp(`{{ (${methodName})\/\\w+ }}`, "g");
      newMatches = newMatches.concat(text.match(regx) || []);
    });
    matches = newMatches;
  }

  function getMatchParameters(regExpMatch) {
    const pair = regExpMatch.replace(/({{ | }})/g, "").split("/"); //rename to functionSymbolPair
    const methodName = pair[0];
    const attributeName = pair[0].toLowerCase();
    const symbol = pair[1];

    return { methodName, attributeName, symbol };
  }

  function fetchNewDataForCurrencyCache() {
    return Promise.all(
      currencyCache.map(async currency => {
        for (var prop in currency) {
          if (!currency[prop]) {
            const methodName = prop.charAt(0).toUpperCase() + prop.slice(1); //change to update
            await availableMethods[methodName](currency);
          }
        }
      })
    );
  }

  function convertText(textToConvert) {
    let textWithReplacedMatches = textToConvert;

    if (matches) {
      matches.forEach(match => {
        const { attributeName, symbol } = getMatchParameters(match);
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

  function showErrors(text) {
    clearErrorMessage();

    const allMatches = text.match(/{{ \w+\/\w+ }}/g);
    const invalidSymbols = [];
    const invalidMethodNames = [];

    if (allMatches) {
      allMatches.forEach(match => {
        const { methodName, attributeName, symbol } = getMatchParameters(match);
        const currency = currencyCache.find(currency => {
          return currency.symbol === symbol;
        });
        const isNewSymbolError = !invalidSymbols.includes(symbol);
        const isNewMethodError = !invalidMethodNames.includes(methodName);
        if (!availableMethods[methodName] && isNewMethodError) {
          //zamienić miejscami
          invalidMethodNames.push(methodName);
        } else if (currency[attributeName] === "invalid" && isNewSymbolError) {
          //zamienić miejscami
          invalidSymbols.push(symbol);
        }
      });
    }
    if (invalidSymbols.length > 0) {
      addErrorMessages(
        invalidSymbols,
        symbol => `This symbol: ${symbol} is not valid`
      );
    }

    if (invalidMethodNames.length > 0) {
      addErrorMessages(
        invalidMethodNames,
        name => `This method name: ${name} is not valid`
      );
    }

    function addErrorMessages(errors, createMessage) {
      errors.forEach(error => {
        const el = document.createElement("p");
        const content = document.createTextNode(createMessage(error));
        el.appendChild(content);
        errorMessageElement.appendChild(el);
      });
      errorMessageElement.classList.add("editor__error-message--active");
    }
  }

  function clearErrorMessage() {
    errorMessageElement.innerHTML = "";
    errorMessage.classList.remove("editor__error-message--active");
  }
})();

cryptoCurrenciesTextEditor.init();
