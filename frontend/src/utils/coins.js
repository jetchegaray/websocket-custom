import btcSymbol from "../UI/img/btc-symbol.svg";
import daiSymbol from "../UI/img/dai-symbol.svg";
import ethSymbol from "../UI/img/eth-symbol.svg";
import usdcSymbol from "../UI/img/usdc-symbol.svg";
import usdtSymbol from "../UI/img/usdt-symbol.svg";

const coinItems = [
  {
    name: "Bitcoin",
    ticker: "BTC",
    symbol: btcSymbol,
  },
  {
    name: "Ethereum",
    ticker: "ETH",
    symbol: ethSymbol,
  },
  {
    name: "USD Coin",
    ticker: "USDC",
    symbol: usdcSymbol,
  },
  {
    name: "Tether",
    ticker: "USDT",
    symbol: usdtSymbol,
    auth: "user",
  },
  {
    name: "Dai Stablecoin",
    ticker: "DAI",
    symbol: daiSymbol,
  },
];

export default coinItems;

export const getCoin = (currency) =>
  coinItems.find((coin) => coin.ticker === currency);
