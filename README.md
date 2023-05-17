# websocket-custom

## Project 

This is a project which implement a websocket low level with the library [WS Npm Package](https://www.npmjs.com/package/ws), [WS Git Repo](https://github.com/websockets/ws). 
The frontend has a crypto widget to convert from one crypto to another, when it is written something in the input from, the front will send a message to the back, while the backend will receieve that message, it will send a request to the min-api-cryptocompare [Crypto compare](https://min-api.cryptocompare.com/) to get a price for those two cyrpto currencies, and it will returns another message to the frontend which will update its widget.   

The idea is using this implementation to write your own subclass channel at the backend which should connect to your favourite exchange/liquidity provider to get a quote and trade the corresponding currencies, using an API to connect to the exchange as I provided or another webSocket connection. I don't recommend this last option, the last section of this file will explore pros and cons

## How I run it ? 

$cd backend
$npm i | npm start

then frontend preferibly in another console

$cd frontend
$npm i | npm start


 ## Environment variables 

### Back ::  
  rename the .env.example to .env
  WS_PORT=3030
  CRYPTOCOMPARE_REST_BASE_URL=https://min-api.cryptocompare.com/

### Front :: 
  rename the .env.example to .env
  REACT_APP_WS_URL=ws://localhost:3030/ws
  REACT_APP_WS_DISABLED=0 # 1 = disabled
  
### Backend code ::: 

#### Index.js 
  - it will create the webserver to create on it the websocket connection, besides a websocket connection is stateful the handshake will be on http, it will listen for messages connection, close and message.
  - it calls an autentication method which it could be rewrite, in this case it will look for the headers x-forwarded-for, user-agent, sec-websocket-key in order to provide some info if you want to get an user in a DB and save the handshake request. every user will have an id and a uuid to link every user to a connection pool. 
  - the handleMessage will forward the message to the channelManager
    
#### ChannelManager 
  - Manage channels interacting with a websocket server, Handles subscribe, unsubscribe, current, all other methods defined on subclass

#### Channel 
  - Base class for a subscribable websocket channel
  - Subscriptions run at `intervalMs`, adjust with setter
  - All commands take a channel name or array of channel names
  
  ```
  To subscribe:
  {
   "subscribe": "channel_name"
  }
  Or unsubscribe:
  {
   "unsubscribe": "channel_name"
  }
  Get current value:
  {
   "current": "channel_name"
  }
  ```

#### Subclass Cryto Compare Channel 
  I implemented a cryptoCompare channel to connect by API rest to get the prices between the cryptos currencies which are coming from the messages of the frontend. If you want to connect with your own liquidity provider you should create one specific channel for that, reusing the base class channel 
  
  - I added to this specific channel, the startSession method and update session method 
  - It manages an array of session (socket are stateful) each linked to an user. 
  - it should be a timeout for each quote, it is the time gap between a client gets a quote for a provider and actually trade it    
  
  
 #### Crypto Compare Session 
    you should implement one of this class, similar to this one when a liquidity provider integration happens. 
    - it manages the getQuote method which matches to the operation updateSession in the channel. 
    - it manages the runningQuotes, and pending. 
    - it is the class which actually is calling the Rest Api in my case or the exchange in the best case escenario. 
    - it calculates a fixed comission of 1% in the transaction. 
    - it could be a redis implementation talking to this class to save running or pending or lastest quotes. 


  
### Frontend code ::: 

#### WebSocketcontext 

#### 

## Messages types 

#### start session

  ``` 
  upcoming message :: received following command at channel rfq
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

    
    
     
