// TO-DO: Adjust admin auth for release

const http = require("http");
const { v4: uuidv4 } = require("uuid");
const uaParser = require("ua-parser-js");
const WebSocketServer = require("ws").Server;
const ChannelManager = require("./src/customWebsocket/channels/ChannelManager");

process.title = "WebsocketServer";
const PING_MS = 10000;
const CLOSE_NO_RETRY = 4422;
const CLOSE_GOING_AWAY = 1001;
const CLOSE_INVALID_USER = 1008;
const PORT = process.env.WS_PORT || 3030;

// start the HTTP server
const server = http.createServer();

// start the websocket server
// `clientTracking` gives access to wss.clients
const wss = new WebSocketServer({ server, clientTracking: true });

// load the available channels
const channelManager = new ChannelManager(wss);

// ping all the websockets, close the dead ones
const pingInterval = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
    } else {
      ws.isAlive = false;
      ws.ping();
    }
  }
}, PING_MS);

wss.on("connection", async (ws, req) => {
  // authenticate & attach user data to ws
  console.log("Authentication....");
  ws.userData = await authenticate(req);

  if (ws.userData.error) {
    ws.close(ws.userData.error);
    return;
  }
  console.log(
    `[user: ${ws.userData.userId}] CONNECT: users: ${wss.clients.size} [${ws.userData.uuid}]`
  );

  // send uuid to client
  ws.send(JSON.stringify({ handshake: ws.userData.uuid }));

  // start the pings
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // handle messages
  ws.on("message", async (msg) => {
    try {
      console.log(`upcoming message :: ${msg}`);
      await handleMessage(ws, JSON.parse(msg));
    } catch (e) {
      console.error(`message error: ${e}`);
      ws.send(JSON.stringify({ status: "error", error: e }));
    }
  });

  // handle close
  ws.on("close", async () => {
    await channelManager.unsubscribeAll(ws);
    console.log(
      `[user: ${ws?.userData?.userId}] DISCONNECT: users: ${wss.clients.size} [${ws?.userData?.uuid}]`
    );
  });
});

wss.on("close", () => {
  cleanup();
});

// start it up!
server.listen(PORT);
console.log(`server listening on port ${PORT}`);

async function handleMessage(ws, msg) {
  // no.5 is alive!
  ws.isAlive = true;

  // key is channel, value is command
  const [channel] = Object.keys(msg);
  const command = msg[channel];

  // only for matching uuid
  if (command.uuid !== ws.userData.uuid) return;
  console.log(`received following command at channel ${channel}`);
  console.log(command);
  typeof command === "string";
  // ? // execute command on channel if command is a string
  //   await channelManager[channel]?.[command]?.(ws)
  // : // use channel in object and send full message
  await channelManager[channel]?.[command.action]?.(ws, command);
}

async function authenticate(req) {
  try {
    const uuid = req?.headers?.["sec-websocket-key"] || uuidv4();
    const userId = uuidv4();

    // get the ip, request info
    let reqInfo = {};
    let ip = "";
    try {
      // get ip
      ip =
        req.headers?.["x-forwarded-for"] || req.connection?.remoteAddress || "";
      const ua = req.headers?.["user-agent"] || "";
      const raw = uaParser(ua);
      reqInfo = { b: raw.browser, os: raw.os, d: raw.device, raw: ua };
    } catch {
      /* don't die */
    }

    return {
      ip,
      uuid,
      userId,
      reqInfo,
      maxAge: 90,
    };
  } catch (error) {
    // on error send invalid user
    console.error("authenticate error", error);
    return error;
  }
}

// going away, bye...
function cleanup() {
  try {
    clearInterval(pingInterval);
    for (const ws of wss.clients) {
      ws.close(CLOSE_GOING_AWAY);
    }
    wss.close();
    server.close();
  } catch {
    /* bye */
  }
}

// clean up sockets, intervals
process.on("SIGHUP", () => {
  cleanup();
  process.exit(1);
});

process.on("SIGINT", () => {
  cleanup();
  process.exit(1);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(1);
});
