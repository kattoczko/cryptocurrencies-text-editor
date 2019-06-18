(function() {
  const textArea = document.getElementById("textArea");
  const convertedText = document.getElementById("convertedText");
  const apiEndpoint = "https://api.coinpaprika.com/v1/";
  const debouncedAddNewMatchedCurrencies = _.debounce(
    updateCurrencyCache, // could define this function inside and rename the parent to updateCurrencyCache
    600
  );
  const currencyCache = []; // currencyCache or smth
  const availableFunctionNames = ["Name", "Price"];
  const functions = {
    //rename to availableFunctions for consistency
    getName: getName, // consider making this a module with these functions defined within
    getPrice: getPrice
  };
  let matches = []; // CONST FFS. also, please move this definition so that it's right below foundCurrencies

  textArea.oninput = updateOutputText;

  function updateOutputText(event) {
    const value = event.target.value;
    debouncedAddNewMatchedCurrencies(value);
    if (currencyCache.length > 0) {
      convertText(value);
    }
  }

  function getMatches(text) {
    // change to updateMatches
    let matches = [];
    availableFunctionNames.forEach(functionName => {
      const regx = new RegExp(`{{ (${functionName})\/\\w+ }}`, "g");
      const newMatches = text.match(regx) || [];
      matches = matches.concat(newMatches);
    });

    return matches;
  }

  function updateCurrencyCache(text) {
    matches = getMatches(text);
    let shouldUpdateCurrencies = false;

    if (matches) {
      matches.map(match => {
        const pair = match.replace(/({{ | }})/g, "").split("/"); //rename to functionSymbolPair
        const attributeName = pair[0].toLowerCase();
        const symbol = pair[1];
        const symbolIndex = currencyCache.findIndex(item => {
          // change to find - you don't need the index
          return item.symbol === symbol;
        });

        if (symbolIndex > -1) {
          if (!currencyCache[symbolIndex][attributeName]) {
            const newFoundMatch = {
              // not needed, just update the reference. read about reference and value types. read some more.
              ...currencyCache[symbolIndex],
              [attributeName]: null
            };
            currencyCache[symbolIndex] = newFoundMatch;
            shouldUpdateCurrencies = true;
          }
        } else {
          const newFoundMatch = {
            ["symbol"]: symbol,
            [attributeName]: null
          };
          currencyCache.push(newFoundMatch);
          shouldUpdateCurrencies = true;
        }
      });

      console.log(currencyCache);
      console.log("shouldUpdateCurrencies", shouldUpdateCurrencies);
      if (shouldUpdateCurrencies) {
        updateFoundCurrencies().then(() => {
          convertText(text);
        });
      }
    }
  }

  function updateFoundCurrencies() {
    return Promise.all(
      currencyCache.map(async (currency, index) => {
        for (var prop in currency) {
          if (!currency[prop]) {
            const functionName =
              "get" + prop.charAt(0).toUpperCase() + prop.slice(1); //change to update
            const newAttributes = await functions[functionName](currency);
            currencyCache[index] = { ...currency, ...newAttributes };
            return newAttributes;
          }
        }
      })
    );
  }

  function convertText(textToConvert) {
    let textWithReplacedMatches = textToConvert;

    if (matches) {
      matches.forEach(match => {
        const pair = match.replace(/({{ | }})/g, "").split("/");
        const attributeName = pair[0].toLowerCase();
        const symbol = pair[1]; // common function getAttributeAndSymbol
        const currency = currencyCache.find(currency => {
          return currency.symbol === symbol;
        });

        if (currency[attributeName] && currency[attributeName] !== "invalid") { // validNameExists or smth
          textWithReplacedMatches = textWithReplacedMatches.replace(
            match,
            currency[attributeName]
          );
        }
      });
    }

    convertedText.innerText = textWithReplacedMatches;
  }

  function getName(currency) {
    console.log("getName");
    return axios
      .get(`${apiEndpoint}search/?q=${currency.symbol}&modifier=symbol_search`)
      .then(res => {
        const currencyData = res.data.currencies.filter(item => {
          return item.symbol === currency.symbol;
        })[0]; // find

        if (currencyData) {
          return { name: currencyData.name, id: currencyData.id };
        } else {
          return { name: "invalid", id: "invalid" };
        }
      });
  }

  async function getPrice(currency) {
    let updatedCurrency = currency; // no need to make a new reference (but double check)
    let basicInfo = {};

    if (!currency.id) {
      basicInfo = await getName(currency);
      updatedCurrency = { ...updatedCurrency, ...basicInfo };
    }

    if (updatedCurrency.id !== "invalid") {
      return axios
        .get(`${apiEndpoint}tickers/${updatedCurrency.id}`)
        .then(res => {
          const price = res.data.quotes.USD.price;

          if (price) {
            return { ...basicInfo, price: price };
          } else {
            return { price: "invalid" };
          }
        });
    }
  }

  // function updateMatches() {
  //   return Promise.all(
  //     foundCurrencies.map((match, i) => {
  //       if (match.name === "") {
  //         return axios
  //           .get(
  //             `${apiEndpoint}search/?q=${match.symbol}&modifier=symbol_search`
  //           )
  //           .then(res => {
  //             const currency = res.data.currencies.filter(item => {
  //               return item.symbol === match.symbol;
  //             })[0];

  //             if (currency) {
  //               return currency.name;
  //             } else {
  //               return "invalid currency";
  //             }
  //           })
  //           .then(name => {
  //             match.name = name;
  //             return match;
  //           })
  //           .then(updatedMatch => {
  //             foundCurrencies[i] = updatedMatch;
  //             return updatedMatch;
  //           })
  //           .finally(() => console.log(foundCurrencies));
  //       } else {
  //         return match;
  //       }
  //     })
  //   );
  // }
})();
