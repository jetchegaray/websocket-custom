import React from "react";
import { useState, useEffect } from "react";
import classes from "./SwapWidget.module.css";
import socketSwapOSL from "../hooks/SocketSwapCryptoCurrency";
import CoinIcon from "./CoinIcon";
import coinItems from "../utils/coins";

const SwapWidget = () => {
  const [fromCurrency, setFromCurrency] = useState("BTC");
  const [toCurrency, setToCurrency] = useState("ETH");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [error, setError] = useState("");
  const [comissionFee, setComissionFee] = useState(0);
  // debounce from amount keypress after millis
  const DEBOUNCE_MS = 600;
  // retry failed websocket connection after millis
  const WS_RETRY = 1500;
  const cryptoCompareInterface = socketSwapOSL();

  const showError = (msg) => {
    setError(msg ?? "");
    if (msg) {
      cryptoCompareInterface.disconnect();
    }
  };
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const handleFromCurrencyChange = (e) => {
    setFromCurrency(e.target.value);
  };

  const handleToCurrencyChange = (e) => {
    setToCurrency(e.target.value);
  };

  const handleFromAmountChange = (e) => {
    setFromAmount(e.target.value);
  };

  const handleToAmountChange = (e) => {
    setToAmount(e.target.value);
  };

  useEffect(() => {
    let timeout = 0;

    // debounce this
    timeout = setTimeout(async () => {
      // check min & max
      const didConnect = cryptoCompareInterface.connected
        ? cryptoCompareInterface.update(fromAmount, [toCurrency, fromCurrency])
        : cryptoCompareInterface.connect(fromAmount, [
            toCurrency,
            fromCurrency,
          ]);

      // ws message failed, retry
      if (!didConnect) {
        await sleep(WS_RETRY);
        const didReconnect = cryptoCompareInterface.connected
          ? cryptoCompareInterface.update(fromAmount, [
              toCurrency,
              fromCurrency,
            ])
          : cryptoCompareInterface.connect(fromAmount, [
              toCurrency,
              fromCurrency,
            ]);
        if (!didReconnect) showError(`Quote failed. Please try again.`);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [fromAmount, fromCurrency, toCurrency]);

  // handle incoming quotes
  useEffect(() => {
    console.log(cryptoCompareInterface.quote?.amountTo);
    if (cryptoCompareInterface.connected) {
      if (cryptoCompareInterface.quote?.amountTo) {
        setToAmount(cryptoCompareInterface.quote.amountTo);
        setExchangeRate(cryptoCompareInterface.quote.exchangeRate);
        setComissionFee(cryptoCompareInterface.quote.comissionFee);
      }
    }
  }, [
    cryptoCompareInterface.quote?.amountTo,
    cryptoCompareInterface.connected,
    cryptoCompareInterface.quote?.exchangeRate,
  ]);

  return (
    <div className={classes.swapWidget}>
      <h2>Crypto Swap</h2>
      <div className="text-sm" style={{ lineHeight: "17px", color: "red" }}>
        {error}
      </div>
      <div className={classes.currencySelector}>
        <label htmlFor="from-currency">From</label>
        <select
          id="from-currency"
          value={fromCurrency}
          onChange={handleFromCurrencyChange}
        >
          {coinItems.map((coinItem) => (
            <option key={coinItem.ticker} value={coinItem.ticker}>
              <CoinIcon currency={coinItem.ticker} />
            </option>
          ))}
        </select>
      </div>
      <div className={classes.amountSelector}>
        <input
          type="number"
          id="from-amount"
          value={fromAmount}
          onChange={handleFromAmountChange}
          placeholder="Enter amount"
        />
        <span className="arrow">&#x2192;</span>
        <input
          type="number"
          id="to-amount"
          value={toAmount}
          onChange={handleToAmountChange}
          placeholder="Converted amount"
        />
      </div>
      <div className={classes.currencySelector}>
        <label htmlFor="to-currency">To</label>
        <select
          id="to-currency"
          value={toCurrency}
          onChange={handleToCurrencyChange}
        >
          {coinItems.map((coinItem) => (
            <option key={coinItem.ticker} value={coinItem.ticker}>
              <CoinIcon currency={coinItem.ticker} />
            </option>
          ))}
        </select>
      </div>
      <p>
        1 {fromCurrency} = {exchangeRate} {toCurrency}
      </p>
      <p>Comission Fee for trading {comissionFee} %</p>
    </div>
  );
};

export default SwapWidget;
