const textArea = document.getElementById("textArea");
const convertedText = document.getElementById("convertedText");
const apiEndpoint = "https://api.coinpaprika.com/v1/";
const debouncedAddNewMatchedCurrencies = _.debounce(
  addNewMatchedCurrencies,
  1000
);
const foundCurrencies = [];
const availableFunctionNames = ["Name", "Price"];

textArea.oninput = function(event) {
  const value = event.target.value;
  debouncedAddNewMatchedCurrencies(value);
  convertText(value);
};

async function addNewMatchedCurrencies(text) {
  const foundCurrenciesLength = foundCurrencies.length;
  let matches = [];
  availableFunctionNames.forEach(functionName => {
    const regx = new RegExp(`{{ (${functionName})\/\\w+ }}`, "g");
    const newMatches = text.match(regx) || [];
    matches = matches.concat(newMatches);
  });

  console.log(matches);

  if (matches) {
    await Promise.all(
      matches.map(async match => {
        const pair = match.replace(/({{ | }})/g, "").split("/");
        const functionName = pair[0];
        const symbol = pair[1];
        const symbolIndex = foundCurrencies.findIndex(item => {
          return item.symbol === symbol;
        });
        let newFoundMatch;

        if (!window[`get${functionName}`]) {
          return;
        }

        if (symbolIndex > -1) {
          if (!foundCurrencies[symbolIndex][functionName.toLowerCase()]) {
            const newAtribute = await window[`get${functionName}`](
              foundCurrencies[symbolIndex]
            );
            newFoundMatch = {
              ...foundCurrencies[symbolIndex],
              ...newAtribute
            };
            foundCurrencies[symbolIndex] = newFoundMatch;
          }
        } else {
          newFoundMatch = { ["symbol"]: symbol };
          const newAtribute = await window[`get${functionName}`](newFoundMatch);
          newFoundMatch = {
            ...newFoundMatch,
            ...newAtribute
          };
          foundCurrencies.push(newFoundMatch);
        }
      })
    );

    console.log(foundCurrencies);
  }

  // if (foundCurrenciesLength !== foundCurrencies.length) {
  //   get().then(() => {
  //     convertText(text);
  //   });
  // }
}

function convertText(textToConvert) {
  let textWithReplacedMatches = textToConvert;

  foundCurrencies.forEach(match => {
    textWithReplacedMatches = textWithReplacedMatches.replace(
      new RegExp(`{{ Name/${match.symbol} }}`, "g"),
      match.name
    );
  });

  convertedText.innerText = textWithReplacedMatches;
}

function getName(currency) {
  console.log("getName");
  return axios
    .get(`${apiEndpoint}search/?q=${currency.symbol}&modifier=symbol_search`)
    .then(res => {
      const currencyData = res.data.currencies.filter(item => {
        return item.symbol === currency.symbol;
      })[0];

      if (currencyData) {
        return { name: currencyData.name, id: currencyData.id };
      } else {
        return { name: "invalid", id: "invalid" };
      }
    });
}

async function getPrice(currency) {
  let updatedCurrency = currency;
  let basicInfo = {};

  if (!currency.id) {
    basicInfo = await getName(currency);
    updatedCurrency = { ...updatedCurrency, ...basicInfo };
  }

  return axios.get(`${apiEndpoint}tickers/${updatedCurrency.id}`).then(res => {
    const price = res.data.quotes.USD.price;

    if (price) {
      return { ...basicInfo, price: price };
    } else {
      return { price: "invalid" };
    }
  });
}

function updateMatches() {
  return Promise.all(
    foundCurrencies.map((match, i) => {
      if (match.name === "") {
        return axios
          .get(`${apiEndpoint}search/?q=${match.symbol}&modifier=symbol_search`)
          .then(res => {
            const currency = res.data.currencies.filter(item => {
              return item.symbol === match.symbol;
            })[0];

            if (currency) {
              return currency.name;
            } else {
              return "invalid currency";
            }
          })
          .then(name => {
            match.name = name;
            return match;
          })
          .then(updatedMatch => {
            foundCurrencies[i] = updatedMatch;
            return updatedMatch;
          })
          .finally(() => console.log(foundCurrencies));
      } else {
        return match;
      }
    })
  );
}
