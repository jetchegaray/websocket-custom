const { isDeepStrictEqual } = require("util");

/**
 * Base class for a subscribable websocket channel
 * Subscriptions run at `intervalMs`, adjust with setter
 *
 * All commands take a channel name or array of channel names
 *
 * To subscribe:
 * {
 *  "subscribe": "channel_name"
 * }
 * Or unsubscribe:
 * {
 *  "unsubscribe": "channel_name"
 * }
 * Get current value:
 * {
 *  "current": "channel_name"
 * }
 */

class Channel {
  /**
   * Channel name used in JSON commands
   * Subclasses must implement!
   * @type {string}
   */
  static channel = "DEFINE_THIS_IN_YOUR_SUBCLASS!";
  #cachedMsg = null;

  // Subclass must call super constructor
  constructor(channelName, wss, intervalMs = 10000) {
    this._interval = null;
    this._subscribers = new Set();
    this._dataReceived = new Set();

    this._wss = wss;
    this._channelName = channelName;
    this._intervalMs = intervalMs;
  }

  get hasSubscribers() {
    return this._subscribers.size > 0;
  }

  // message envelope with data and channel name
  #envelope(msg) {
    return JSON.stringify({
      channel: this._channelName,
      ...msg,
    });
  }

  /**
   * Check for changed data, JSONify, and add channel name
   * @returns {Array} result - changed status & JSON
   * @returns {boolean} result[0] - true if data changed; false is same as cached
   * @returns {string} result[1] - JSON data with channel added
   */
  async wrapData() {
    try {
      const msg = await this.getData();
      if (!msg) return [false, null];
      // get changed
      const changed = !isDeepStrictEqual(this.#cachedMsg, msg);
      this.#cachedMsg = msg;
      // return changed status and JSON
      return [changed, this.#envelope(msg)];
    } catch (e) {
      return [false, null];
    }
  }

  /**
   * Get the last data from the channel
   * Subclasses can implement but false. which causes currentCached to noop
   *
   * @returns {object} - response data
   */
  async getCachedData() {
    return false;
  }

  /**
   * Produce the channel's data
   * Subclasses must implement this!
   *
   * @returns {object} - response data
   */
  async getData() {
    console.error('must implement "getData"');
    throw Error();
  }

  /**
   * Hook before channel start
   * Override to add functionality
   *
   * @returns {boolean} - True or false to continue
   */
  async startHook() {
    return true;
  }

  /**
   * Hook before channel stop
   * Override to add functionality
   */
  async stopHook() {
    // do something useful
  }

  /**
   * Hook before subscription
   * Default checks for existence of user ID on websocket
   * Override to add functionality
   *
   * @param {Websocket} ws - Requesting websocket
   * @returns {boolean} - True or false to continue
   */
  async preSubscribeHook(ws) {
    return !!ws?.userData?.userId;
  }

  /**
   * Hook before unsubscription
   * Override to add functionality
   *
   * @param {Websocket} ws - Requesting websocket
   */
  async preUnsubscribeHook(ws) {
    // do something here
  }

  /**
   * Hook before current
   * Default checks for existence of user ID on websocket
   * Override to add functionality
   *
   * @param {Websocket} ws - Requesting websocket
   * @returns {boolean} - True or false to continue
   */
  async preCurrentHook(ws) {
    return !!ws?.userData?.userId;
  }

  /**
   * Start channel
   *
   * Will start a channel with subscribers only if not running.
   * Will NOT start a channel with no subscribers.
   * @returns {boolean} - True if channel started up; false if already started or no subs
   */
  async start() {
    // skip already started or no subscribers
    if (this._interval || !this.hasSubscribers) return false;

    // run start hook
    if (!(await this.startHook())) return false;

    // start it up!
    console.log(`started ${this._channelName}`);
    this._interval = setInterval(async () => {
      await this.broadcast();
    }, this._intervalMs);

    // fire off first data
    await this.broadcast();
    return true;
  }

  /**
   * Stop channel
   *
   * Will stop a channel with no subscribers only if running.
   * Will NOT stop a channel with subscribers.
   */
  async stop() {
    // skip already stopped or has subscribers
    if (!this._interval || this.hasSubscribers) return;

    // run stop hook
    await this.stopHook();

    // halt!
    console.log(`stopped ${this._channelName}`);
    clearInterval(this._interval);
    this._interval = null;
  }

  /**
   * Broadcast messages to channel subscribers
   */
  async broadcast() {
    // no subscribers, stop
    if (!this.hasSubscribers) return this.stop();

    // get message
    const [changed, data] = await this.wrapData();
    if (!data) return;

    // broadcast to all subscribers
    for (const ws of this._wss.clients) {
      // confirm user is subscribed
      const { userId } = ws.userData;
      if (!this._subscribers.has(userId)) continue;

      // data has NOT changed & subscriber has received data, continue
      if (!changed && this._dataReceived.has(userId)) continue;

      // mark subscriber received data
      this._dataReceived.add(userId);

      // send it
      try {
        ws.send(data);
      } catch {}
    }
  }

  /**
   * Send websocket single cached message from channel
   * Useful for new users joining subscription
   *
   * @param {Websocket} ws - Websocket to send message
   */
  async currentCached(ws) {
    // pre-hook
    if (!(await this.preCurrentHook(ws))) return;

    const data = await this.getCachedData();
    // skip if no cached data
    if (!data) return;

    console.log("returned cached data");
    // send data
    ws.send(this.#envelope(data));
  }

  /// PUBLIC METHODS ARE CALLED BY THE WEBSOCKET
  /// TO INTERACT WITH CHANNEL

  /**
   * Subscribe websocket to a channel
   * Exceptions NOT passed on
   *
   * @param {Websocket} ws - Websocket to subscribe
   */
  async subscribe(ws) {
    try {
      // subscription not supported
      if (this._intervalMs < 1) return;

      // pre-hook
      if (!(await this.preSubscribeHook(ws))) return;
      const { userId } = ws.userData;

      // sub if user not subscribed
      if (!this._subscribers.has(userId)) {
        this._dataReceived.delete(userId);
        this._subscribers.add(userId);
        // start & run a broadcast
        const started = await this.start();
        // if started send cached data
        if (!started) {
          this.currentCached();
        }
      }
    } catch (error) {
      console.error("unsubscribe error", error);
    }
  }

  /**
   * Unubscribe websocket from a channel
   * Exceptions NOT passed on
   *
   * @param {WebSocket} ws - Websocket to unsubscribe
   */
  async unsubscribe(ws) {
    try {
      // pre-hook
      await this.preUnsubscribeHook(ws);
      const { userId } = ws?.userData;

      // unsub if user subscribed
      if (this._subscribers.has(userId)) {
        this._subscribers.delete(userId);
        this._dataReceived.delete(userId);
        await this.stop();
      }
    } catch (error) {
      console.error("unsubscribe error", error);
    }
  }

  /**
   * Send websocket single message from channel
   * Exceptions NOT passed on
   *
   * @param {Websocket} ws - Websocket to send message
   */
  async current(ws) {
    try {
      // pre-hook
      if (!(await this.preCurrentHook(ws))) return;

      // get message, ignore changed
      const [, data] = await this.wrapData();
      if (!data) return;

      // send data
      ws.send(data);
    } catch (error) {
      console.error("current error", error);
    }
  }
}

module.exports = Channel;
