import { useContext, useEffect, useState } from "react";
import { weakRandomString } from "../utils/random";
import { WebsocketContext } from "./WebsocketContext";

const DEFAULT_MSG = { type: "" };
const CHANNEL = "rfq";
const SERVICE_DECIMALS = 5;

const SocketSwapOSL = () => {
  const [key, setKey] = useState("");
  const [quote, setQuote] = useState({});
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MSG);
  const { send, messages } = useContext(WebsocketContext);

  const stopQuotes = () => {
    setKey("");
    setMessage(DEFAULT_MSG);
    setQuote({});
  };

  const disconnect = () => {
    if (connected) {
      setConnected(false);
      send(CHANNEL, {
        key,
        action: "stopSession",
      });
      stopQuotes();
    }
  };

  const connect = (amountFrom, pair) => {
    if (connected) return true;
    const ok = send(CHANNEL, {
      action: "startSession",
      key: weakRandomString(),
      currTo: pair[0],
      currFrom: pair[1],
      amountFrom: String(amountFrom),
    });
    return ok;
  };

  const update = (amountFrom, pair) => {
    if (!connected) return false;
    const ok = send(CHANNEL, {
      key,
      action: "updateSession",
      currTo: pair[0],
      currFrom: pair[1],
      amountFrom: String(amountFrom),
    });
    return ok;
  };

  //not being called
  const acceptOffer = (quoteId) => {
    if (!quoteId) return false;
    // place order
    const order = { action: "placeOrder", key, quoteId };
    send(CHANNEL, order);
    return true;
  };

  const actionConnected = (data) => {
    // don't connect if connected or interval is running
    if (connected) {
      console.log(`Already Connected to ${data.key}`);
      return;
    }
    setKey(data.key);
    setConnected(true);
    console.log(`Connected to ${data.key}`);
  };

  const actionDisconnected = (data) => {
    // don't disconnect if key mismatch
    if (data.key !== key) return;
    stopQuotes();
    setConnected(false);
  };

  const actionOffer = (data) => {
    // don't accept offer if not connected or key mismatch
    if (!connected || data.key !== key) return;
    // save the offer
    setQuote(data);
  };

  //not being called
  const actionOrderSuccess = (data) => {
    // don't accept order if not connected or key mismatch
    if (!connected || data.key !== key) return;
    disconnect();
    // this will happen on disconnect but safer to do it here as well
    stopQuotes();
    setConnected(false);
    setMessage({
      type: "success",
      data,
    });
  };

  //not being called
  const actionOrderFailed = (data) => {
    // don't fail order if not connected or key mismatch
    if (!connected || data.key !== key) return;
    setMessage({
      type: "error",
      data,
    });
  };

  //not being called
  const actionOfferFailed = (data) => {
    // don't fail offer if not connected or key mismatch
    if (!connected || data.key !== key) return;
    setMessage({
      type: "error",
      data: {
        message: "Offer failed. Please try again.",
      },
    });
  };

  const actionTimeout = (data) => {
    // don't fail order if not connected or key mismatch
    if (!connected || data.key !== key) return;
    setMessage({
      type: "timeout",
    });
  };

  useEffect(() => {
    const { [CHANNEL]: msg } = messages;
    if (!msg) return;

    switch (msg.action) {
      case "connected": {
        actionConnected(msg);
        break;
      }
      case "disconnected": {
        actionDisconnected(msg);
        break;
      }
      case "offer": {
        actionOffer(msg);
        break;
      }
      case "offer-failed": {
        actionOfferFailed(msg);
        break;
      }
      case "order-success": {
        actionOrderSuccess(msg);
        break;
      }
      case "order-failed": {
        actionOrderFailed(msg);
        break;
      }
      case "ws-fail":
      case "timeout": {
        actionTimeout(msg);
        break;
      }
      default: {
        break;
      }
    }
  }, [messages[CHANNEL]]);

  return {
    quote,
    update,
    connect,
    message,
    connected,
    disconnect,
    acceptOffer,
    serviceDecimals: SERVICE_DECIMALS,
  };
};

export default SocketSwapOSL;
