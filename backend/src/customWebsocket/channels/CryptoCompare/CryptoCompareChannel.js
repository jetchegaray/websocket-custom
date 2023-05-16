const Channel = require("../Channel");
const CryptoCompareSession = require("./CryptoCompareSession");

class CryptoCompareChannel extends Channel {
  static channel = "rfq";

  #sessions = {};
  #quoteTimeout = 50;

  constructor(wss) {
    // always call super
    // we handle subscriptions
    super(CryptoCompareChannel.channel, wss, -1);
    this.#quoteTimeout = 120;
  }

  // override (called on ws disconnect)
  // kill all sessions
  async unsubscribe(ws) {
    for (const session of Object.values(this.#sessions)) {
      if (ws.userData.uuid === session.uuid) {
        session.stop();
        delete this.#sessions[session.key];
      }
    }
  }

  //not being called, but when you want to connect to a real liquidity provider, it will be necessary
  async placeOrder(ws, data) {
    const session = this.#sessions[data?.key];
    if (!session) return;
    await session.sendOrder(ws.userData, data);
  }

  async stopSession(ws, data) {
    const session = this.#sessions[data?.key];
    if (!session) return;
    session.stop(ws.userData);
    delete this.#sessions[session.key];
    console.log(`[user: ${ws?.userData?.userId}] stop [${ws?.userData?.uuid}]`);
  }

  async updateSession(ws, data) {
    const session = this.#sessions[data?.key];
    if (!session) return;
    data.quoteTimeout = this.#quoteTimeout;
    await session.update(ws.userData, data);
  }

  async startSession(ws, data) {
    data.quoteTimeout = this.#quoteTimeout;
    const session = new CryptoCompareSession(ws, data);
    this.#sessions[session.key] = session;
    try {
      session.start(ws.userData);
    } catch (err) {
      console.error("session.start()", err);
    }
  }
}

module.exports = CryptoCompareChannel;
