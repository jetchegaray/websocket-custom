import { createContext, useCallback, useEffect, useRef, useState } from "react";

// try to reconnect at these sec intervals
const RECONNECT_BACKOFF = [3, 5, 8, 13, 21, 34];
const RECONNECT_LIMIT = RECONNECT_BACKOFF.length;

export const WebsocketContext = createContext({
  messages: {},
  connected: false,
  subscriptions: [],
  // methods
  send: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
});

export const WebsocketProvider = ({ url, disabled = false, children }) => {
  const wsRef = useRef(null);
  const reconnects = useRef(0);
  const connected = useRef(false);
  const reconnectTimer = useRef(0);
  const [messages, setMessages] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);

  const clearReconnectTimer = () => {
    clearTimeout(reconnectTimer.curr);
    reconnectTimer.current = 0;
    reconnects.current = 0;
  };

  const reconnect = () => {
    clearReconnectTimer();
    connect();
    return false;
  };

  const subscribe = (channel, data = null) => {
    if (!connected.current || !wsRef.current) return reconnect();
    const command = data ?? "subscribe";
    wsRef.current.send(JSON.stringify({ [channel]: command }));
    if (!subscriptions.includes(channel)) {
      setSubscriptions((subs) => [...subs, channel]);
    }
  };

  const unsubscribe = (channel, data = null) => {
    if (!connected.current || !wsRef.current) return reconnect();
    const command = data ?? "unsubscribe";
    wsRef.current.send(JSON.stringify({ [channel]: command }));
    if (subscriptions.includes(channel)) {
      setSubscriptions((subs) => subs.filter((c) => c !== channel));
    }
    if (!!messages[channel]) {
      setMessages((m) => ({ ...m, [channel]: null }));
    }
  };

  const send = useCallback(
    (channel, data) => {
      if (!connected.current || !wsRef.current) return reconnect();
      // attach uuid to data
      data.uuid = wsRef.current.uuid;
      wsRef.current.send(JSON.stringify({ [channel]: data }));
      return true;
    },
    [connected.current, wsRef.current]
  );

  const connect = useCallback(() => {
    // ignore if not ready/possible to run
    console.log("connecting to..." + url);
    if (!url || disabled || reconnectTimer.current) {
      return;
    }
    // ignore if ws connected or connecting
    if (
      connected.current ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    // connect
    wsRef.current = new window.WebSocket(url);

    // handle close event (happens even on open failure)
    wsRef.current.onclose = () => {
      if (reconnects.current < RECONNECT_LIMIT) {
        reconnectTimer.current = setTimeout(() => {
          reconnectTimer.current = 0;
          connect();
        }, RECONNECT_BACKOFF[reconnects.current] * 1000);
        reconnects.current++;
      }
      connected.current = false;
      // set messages to ws-fail then clear
      setMessages((messages) =>
        Object.keys(messages).reduce((acc, curr) => {
          if (messages[curr].action !== "ws-fail") {
            acc[curr] = { ...messages[curr] };
            acc[curr].action = "ws-fail";
          }
          return acc;
        }, {})
      );
    };

    // handle open event
    wsRef.current.onopen = () => {
      reconnects.current = 0;
      clearReconnectTimer();
      connected.current = true;
    };

    // handle message event
    wsRef.current.onmessage = (event) => {
      console.log(JSON.stringify(event.data));
      const data = JSON.parse(event.data);
      if (data.handshake) {
        wsRef.current.uuid = data.handshake;
      }
      // keep a table of channels -> messages
      else if (data.channel) {
        setMessages((m) => ({ ...m, [data.channel]: data }));
      }
    };
  }, []);

  useEffect(() => {
    connect();
  }, []);

  return (
    <WebsocketContext.Provider
      value={{
        send,
        messages,
        subscribe,
        unsubscribe,
        subscriptions,
        connected: connected.current,
      }}
    >
      {children}
    </WebsocketContext.Provider>
  );
};
