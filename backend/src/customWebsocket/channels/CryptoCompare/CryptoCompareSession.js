const { parseUnits, formatUnits } = require("ethers");
const { getPrice } = require("./CryptoCompareRest");
const { safeWei } = require("../utils");

const QUOTE_INTERVAL = 4000;
const QUOTE_ERROR_TOLERANCE = 2;
const CHANNEL = "rfq";
const DECIMALS_AMOUNT = 2;
const COMISSION_FEE_PERCENTAGE = 1;

class CryptoCompareSession {
  #ws = null;
  #rfq = {};
  #interval = 0;
  #offerCache = [];
  #pendingUpdate = null;
  #errCnt = 0;
  #quoteCnt = 0;
  #runningQuote = false;

  constructor(ws, rfq) {
    this.#ws = ws;
    this.#rfq = rfq;
  }

  get key() {
    return this.#rfq.key;
  }

  get uuid() {
    return this.#ws.userData.uuid;
  }

  // send message to client websocket
  send(data) {
    const msg = {
      ...data,
      key: this.key,
      channel: CHANNEL,
    };
    try {
      this.#ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error(" ws error", err);
    }
  }

  sendQuote = async () => {
    // we should send the quote to the liquidity provider.In this case we call a market price compare.
    let userId = 0;
    let uuid = "";

    // skip if interval closed
    if (!this.#interval || this.#runningQuote) return;

    try {
      this.#runningQuote = true;

      const { currFrom, currTo, amountFrom, quoteTimeout } = this.#rfq;
      userId = this.#ws.userData?.userId;
      uuid = this.#ws.userData?.uuid;

      const bnAmountFrom = parseUnits(amountFrom.toString());
      if (!safeWei(bnAmountFrom.toString())) {
        this.#errCnt = QUOTE_ERROR_TOLERANCE;
        throw new Error("Invalid amount");
      }

      // request from the provider
      const result = await getPrice(currFrom, currTo);
      console.log(`result from cryptoCompare ${JSON.stringify(result)}`);

      if (!result) {
        throw new Error(`Invalid quote: ${result || "Failed"}`);
      }

      // get fee, remaining amount
      const bnComissionFee = COMISSION_FEE_PERCENTAGE;
      const bnFeeFrom = (bnComissionFee * amountFrom) / 100;
      const bnFromRemaining = amountFrom - bnFeeFrom;
      const bnPrice = result[currTo];

      console.log(
        `bnAmountFrom ${amountFrom} Comission ${COMISSION_FEE_PERCENTAGE} && bnFeeFrom ${bnFeeFrom} && bnFromRemaining ${bnFromRemaining}
        && bnPrice ${bnPrice}`
      );

      const amountToSend = bnFromRemaining * bnPrice;
      // send offer to client
      this.send({
        amountTo: amountToSend.toFixed(2),
        amountFrom,
        exchangeRate: bnPrice.toFixed(2),
        comissionFee: COMISSION_FEE_PERCENTAGE,
        action: "offer",
      });

      console.log(
        `[user: ${userId}] cryto compare : ${amountFrom} ${currFrom} => ${amountToSend} ${currTo} ( #quoteCnt = ${
          this.#quoteCnt
        }) [uuid = ${uuid}]`
      );
      this.#quoteCnt++;

      // timeout if over quote limit
      if (this.#quoteCnt > quoteTimeout) {
        this.timeout();
      }
    } catch (error) {
      console.error(
        `[user: ${userId}] crypto compare getPrice error ( #quoteCnt = ${
          this.#errCnt
        }) [uuid = ${uuid}]`,
        error.message
      );
      // send error if over error count
      if (this.#errCnt >= QUOTE_ERROR_TOLERANCE) {
        this.clear();
        this.send({
          message: `Offer failed: ${error.message}`,
          action: "offer-failed",
        });
      }
      this.#errCnt++;
    } finally {
      this.#runningQuote = false;
    }
  };

  async sendOrder(userData, quote) {
    //we should implement the execute trade in the liquidity provider.
  }

  clear() {
    clearInterval(this.#interval);
    this.#interval = 0;
  }

  startQuotes() {
    // clear cache, counts
    this.#errCnt = 0;
    this.#quoteCnt = 0;
    this.#offerCache = [];
    this.stopQuotes();

    // start interval
    this.#runningQuote = false;
    this.#interval = setInterval(async () => {
      this.sendQuote();
    }, QUOTE_INTERVAL);

    // send first quote
    this.sendQuote();
  }

  // if restart true, will look for pending udate to restart
  stopQuotes(restart = false) {
    this.clear();
    if (restart) {
      // if we have a pending update, update and restart
      if (this.#pendingUpdate) {
        this.#rfq = { ...this.#pendingUpdate };
        this.#pendingUpdate = null;
        this.startQuotes();
      }
    } else {
      this.#pendingUpdate = null;
    }
  }

  timeout() {
    this.stopQuotes();
    // send timeout msg
    this.send({
      action: "timeout",
    });
  }

  stop() {
    this.stopQuotes();
  }

  async update(userData, data) {
    // ignore if same
    if (
      data.currFrom === this.#rfq.currFrom &&
      data.currTo === this.#rfq.currTo &&
      data.amountFrom === this.#rfq.amountFrom
    ) {
      return;
    }

    // if running add pending update and stop
    if (this.#interval) {
      this.#pendingUpdate = data;
      this.stopQuotes(true);
    } else {
      // update rfq
      this.#rfq = data;
      // restart
      this.startQuotes();
    }
  }

  async start() {
    // send client session key
    this.send({
      action: "connected",
    });
    // start quotes
    this.startQuotes();
  }
}

module.exports = CryptoCompareSession;
