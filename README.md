# websocket-custom

## Project 

The idea of this project is to provide an architecture of low-level hierarchies and composition classes to reuse if you want to connect a websocket to your favorite exchange or liquidity provider for trading. The only thing you have to do is inherit your own channel and session at the backend and for your corresponding provider, and implement the methods getQuote and acceptOffer to interact with your exchange. It could be useful too if you have your own utility token in an own HotWallet running in some node, this would avoid external connections. 

It is an implementation of a low-level websocket with the library [WS NPM Package](https://www.npmjs.com/package/ws), [WS Git Repo](https://github.com/websockets/ws). 

The frontend has a crypto widget to convert one crypto to another. When something is written in the input from value, the frontend will send a message to the backend, while the backend will
When it receives that message, it will send a request to min-api-cryptocompare [Crypto compare](https://min-api.cryptocompare.com/) to get a price for those two crypto currencies, and it will
returns another message to the frontend, which will update its widget.

You can define an API to connect to the exchange, as I provided, or another web socket connection from the exchange back to your provider. [The last section](#last-considerations) of this file will try to explore the pros and cons.

## How do I run it?

```
$ cd backend
$ npm i | npm start
```

then frontend, preferably on another console.

```
$ cd frontend
$ npm i | npm start
```

 ## Environment variables

### Back ::  
Rename the .env.example to .env
  WS_PORT=3030
  CRYPTOCOMPARE_REST_BASE_URL=https://min-api.cryptocompare.com/

### Front :: 
Rename the .env.example to .env
  REACT_APP_WS_URL=ws://localhost:3030/ws
REACT_APP_WS_DISABLED=0 # 1 = disabled
  
### Backend code ::: 

#### Index.js 
  - it will create the webserver to create on it the websocket connection, besides the fact that a websocket connection is stateful, the handshake will be on http, and it will listen for connections, closes, and messages.
It calls an authentication method that could be rewritten; in this case, it will look for the headers x-forwarded-for, user-agent, and sec-websocket-key in order to provide some information if you want to get an account in a database and save the handshake request. Every user will have an id and a uuid to link them to a connection pool. 
  - the handle The message will be forwarded to the channel. Manager
    
#### ChannelManager 
  - Manage channels interacting with a websocket server. Handles subscribe, unsubscribe, current, and all other methods defined on the subclass.

#### Channel 
  - Base class for a subscribable websocket channel
  - Subscriptions run at `intervalMs`, adjust with the setter.
  - All commands take a channel name or array of channel names.
 
 ```
  To subscribe:
  {
   "subscribe": "channel_name"
  }
  
  Or unsubscribe:
  {
   "unsubscribe": "channel_name"
  }
  
  Get the current value:
  {
   "current": "channel_name"
  }
  ```

#### Subclass Cryto Compare Channel
I implemented a cryptoCompare channel to connect by API rest to get the prices between the crypto currencies, which are coming from the messages of the frontend. If you want to connect with your own liquidity provider, you should create a specific channel for that, reusing the base class channel.
  
  - I added to this specific channel the startSession method and the updateSession method.
  - It manages an array of sessions (sockets are stateful), each linked to a user.
It should be a timeout for each quote; it is the time gap between when a client gets a quote from a provider and actually trades it.
  
  
 #### Crypto Compare Session
You should implement one of these classes, similar to this one, when a liquidity provider integration happens.
  - It manages the getQuote method, which matches the operation updateSession in the channel.
  - It manages the running quotes and pending.
  - It is the class that is actually called the Rest Api in my case or the exchange in the best-case scenario.
  - It calculates a fixed commission of 1% on the transaction.
  - It could be a Redis implementation talking to this class to save running, pending, or latest quotes.


  
### Frontend code ::: 

#### WebSocketcontext 
It is a react context that handles the client side connection of the websocket and its corresponding events: listeners open, close, message, and the methods send, subscribe to a channel, and unsubscribe from a channel.
It also handles subscriptions and messages.

#### SocketSwapCrytoCompare
It implements a channel on the client side for a specific provider. We should create one of these per liquidity provider or exchange.
  - Implements the sendQuote, acceptOffer, actionOrderSuccess, actionOrderFailed, and actionOfferFailed methods for a channel and connects to and disconnects from the channel. 
    
 

## Message types

#### start session

  ```
  upcoming message :: received the following command at channel rfq
    {
      "rfq":{
          "action":"startSession",
          "key":"0222ff9c7fa110811684328411374",
          "currTo":"ETH",
          "currFrom":"BTC",
          "amountFrom":"",
          "uuid":"i69esbm2Xr3foIPIEkPcTw=="
        }
    }
   ```
   
#### update session
```
{
  key: '0222ff9c7fa110811684328411374',
  action: 'updateSession',
  currTo: 'ETH',
  currFrom: 'BTC',
  amountFrom: '10',
  uuid: 'i69esbm2Xr3foIPIEkPcTw=='
}
```
    
## Last considerations
  - To prevent information leakage, use the WebSocket Secure (wss://) protocol. Like HTTPS, wss doesn’t mean your web application is secure, but ensures that data transmission is encrypted using Transport Layer Security (TLS).
  - It could be tricky if you don't use a load balancer layer 4 for websocket. for example if you use a load balancer or proxy layer 7 which support websocket could be challenging. As you know in Layer 7 proxy has to break the TLS, it has to terminate the TLS most of the times, in order to look at the 7 layer data which is HTTP, and the moment it does that it has to create its own TCP connections, one biderectional between the proxy-server and another one between client-proxy, so it is a mess and it could lead to leaks and misfunctioning 
  - A desirable enhancement could be having a Redis cache for prices    

## Demo

[demo-websocket-exchange-trading.webm](https://github.com/jetchegaray/websocket-custom/assets/4106048/65294017-2411-4b40-89a5-a3ebf2911b3b)

 
