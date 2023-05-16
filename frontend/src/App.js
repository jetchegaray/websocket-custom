import "./App.css";
import React from "react";
import SwapWidget from "./components/SwapWidget";
import { WebsocketProvider } from "./hooks/WebsocketContext";

function App() {
  return (
    <main>
      <WebsocketProvider url={process.env.REACT_APP_WS_URL}>
        <SwapWidget />
      </WebsocketProvider>
    </main>
  );
}

export default App;
