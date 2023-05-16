import { useState, useEffect } from "react";
import axios from "axios";
import classes from "./SwapWidget.module.css";
import socketSwapOSL from "../hooks/SocketSwapOSL";

const SwapWidget = () => {
  const [fromCurrency, setFromCurrency] = useState("BTC");
  const [toCurrency, setToCurrency] = useState("ETH");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");

  // debounce from amount keypress after millis
  const DEBOUNCE_MS = 600;
  // retry failed websocket connection after millis
  const WS_RETRY = 1500;
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // swap, OSL hooks
  const hooks = {
    OSL: socketSwapOSL(),
    //add more provider in case you need
  };

  useEffect(() => {
    const apiUrl = `https://min-api.cryptocompare.com/data/price?fsym=${fromCurrency}&tsyms=${toCurrency}`;
    axios
      .get(apiUrl)
      .then((response) => {
        const rate = response.data[toCurrency];
        console.log(rate);
        setExchangeRate(rate);
      })
      .catch((error) => console.log(error));
  }, [fromCurrency, toCurrency]);

  const handleFromCurrencyChange = (e) => {
    setFromCurrency(e.target.value);
  };

  const handleToCurrencyChange = (e) => {
    setToCurrency(e.target.value);
  };

  const handleFromAmountChange = (e) => {
    setFromAmount(e.target.value);
    setToAmount(e.target.value * exchangeRate);
  };

  const handleToAmountChange = (e) => {
    setToAmount(e.target.value);
    setFromAmount(e.target.value / exchangeRate);
  };

  const order = () => {
    if (isSim) return;
    setOrdering(acceptOffer(quote.quoteId));
  };

  const onSelectFrom = (curr) => {
    setHiddenFrom(true);
    clickClear();
    setCurrFrom(curr);
    if (curr === currTo) setCurrTo("");
  };

  const onSelectTo = (curr) => {
    setHiddenTo(true);
    clickClear();
    setCurrTo(curr);
    if (curr === currFrom) setCurrFrom("");
  };

  const clickTransactions = () => {
    history.push("/transactions/wallet-ledger");
    clickClear();
  };

  const clickConfirm = () => {
    if (isSim) return;
    setConfirming(true);
  };

  const clickCancelConfirm = () => {
    setConfirming(false);
    if (!!error) clickClear();
  };

  // clear everything!
  const clickClear = () => {
    disconnect();
    setError("");
    setValue("amountFrom", undefined);
    setValue("amountTo", undefined);
    setIsSim(false);
    setFinalAmountTo(0);
    setOrdering(false);
    setConfirming(false);
    setPurchased(false);
    setPercentButton(0);
    lastAmountFrom.current = undefined;
  };

  const clickSwitchAssets = () => {
    clickClear();
    const from = currFrom;
    setCurrFrom(currTo);
    setCurrTo(from);
  };

  useEffect(() => {
    let timeout = 0;
    if (currFrom && currTo) {
      // set provider from pair
      swapType.current = getSwapProvider(currFrom, currTo);
    }
    if (!isValid() || !watchAmountFrom || watchAmountFrom <= 0) {
      disconnect();
      showError();
      setValue("amountTo", undefined);
      lastAmountFrom.current = undefined;
      setPercentButton(0);
      setIsSim(false);
    } else {
      // skip if formated amount hasn't changed
      if (formattedAmount === lastAmountFrom.current) return;
      lastAmountFrom.current = formattedAmount;
      const formattedMin = getFormattedMin();
      // a bit ugly, we don't want the commas on the trimmed remaining
      const formattedRemaining = formatTrim(getFormattedRemaining(), {
        ...formatProps,
        commas: false,
      });
      const formattedPercent =
        percentButton === 0
          ? formattedAmount
          : formatCurr(
              currencyPercentage(formattedAvail, currFrom, percentButton)
            );
      // clear the percent button on change if
      // FROM amount not equal to correct percentage
      // and FROM amount is not equal to available
      // and FROM amount is not equal to remaining
      if (
        formattedPercent !== formattedAmount &&
        formattedRemaining !== formattedAmount &&
        formattedAvail !== formattedAmount
      ) {
        setPercentButton(0);
      }
      // debounce this
      timeout = setTimeout(async () => {
        if (currencyGt(formattedAmount, formattedRemaining, currFrom)) {
          showError(
            `Exceeds ${formatTrim(formattedRemaining)} ${currFrom} max trade.`
          );
        }
        // check min & max
        else if (currencyLt(formattedAmount, formattedMin, currFrom)) {
          showError(
            `Below ${formatDisplay(formattedMin)} ${currFrom} minimum trade.`
          );
        } else {
          showError();
          setValue("amountTo", "Loading...");
          // check if simulation
          const isSimulation =
            currencyGt(formattedAmount, formattedAvail, currFrom) ||
            currencyGt(formattedAmount, formattedRemaining, currFrom);
          setIsSim(isSimulation);

          const didConnect = connected
            ? update(formattedAmount, [currTo, currFrom], isSimulation)
            : connect(formattedAmount, [currTo, currFrom], isSimulation);

          // ws message failed, retry
          if (!didConnect) {
            await sleep(WS_RETRY);
            const didReconnect = connected
              ? update(formattedAmount, [currTo, currFrom], isSimulation)
              : connect(formattedAmount, [currTo, currFrom], isSimulation);
            if (!didReconnect) showError(`Quote failed. Please try again.`);
          }
        }
      }, DEBOUNCE_MS);
    }
    return () => clearTimeout(timeout);
  }, [watchAmountFrom, currFrom, currTo, serviceDec]);

  return (
    <div className={classes.swapWidget}>
      <h2>Crypto Swap</h2>
      <div className={classes.currencySelector}>
        <label htmlFor="from-currency">From</label>
        <select
          id="from-currency"
          value={fromCurrency}
          onChange={handleFromCurrencyChange}
        >
          <option value="BTC">Bitcoin</option>
          <option value="ETH">Ethereum</option>
          <option value="LTC">Litecoin</option>
          {/* Add more cryptocurrency options here */}
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
        <span className="arrow">&#x2194;</span>
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
          <option value="BTC">Bitcoin</option>
          <option value="ETH">Ethereum</option>
          <option value="LTC">Litecoin</option>
          {/* Add more cryptocurrency options here */}
        </select>
      </div>
      <p>
        1 {fromCurrency} = {exchangeRate} {toCurrency}
      </p>
    </div>
  );
};

export default SwapWidget;
