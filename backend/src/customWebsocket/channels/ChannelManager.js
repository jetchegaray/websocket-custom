const CryptoCompareChannel = require("./CryptoCompare/CryptoCompareChannel.js");

/**
 * Manage channels interacting with a websocket server
 * Handles subscribe, unsubscribe, current
 * All other methods defined on subclass
 *
 * @see {@link Channel.js}
 */
class ChannelManager {
  #channels = {};

  constructor(wss) {
    this.#loadChannels(wss);
  }

  /**
   * Load all channels
   *
   * @param {WebSocketServer} wss - Running websocket server with `clientTracking` enabled
   */
  #loadChannels = (wss) => {
    // IMPORTANT! manually add all channels here
    // second constuctor arg is ms for subscription interval
    this.#channels[CryptoCompareChannel.channel] = new CryptoCompareChannel(
      wss,
      10000
    );

    // set up dynamic channel-name getters
    for (const [k, v] of Object.entries(this.#channels)) {
      Object.defineProperty(this, k, {
        get: () => v,
      });
    }
  };

  get channelNames() {
    return Object.keys(this.#channels);
  }

  async current(channels, ws) {
    channels = Array.isArray(channels) ? channels : [channels];
    for (const ch of channels) {
      await this[ch]?.current(ws);
    }
  }

  async subscribe(channels, ws) {
    channels = Array.isArray(channels) ? channels : [channels];
    for (const ch of channels) {
      await this[ch]?.subscribe(ws);
    }
  }

  async unsubscribe(channels, ws) {
    channels = Array.isArray(channels) ? channels : [channels];
    for (const ch of channels) {
      try {
        await this[ch]?.unsubscribe(ws);
      } catch {}
    }
  }

  async unsubscribeAll(ws) {
    await this.unsubscribe(this.channelNames, ws);
  }
}

module.exports = ChannelManager;
