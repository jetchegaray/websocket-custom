import coinItems, { getCoin } from "../utils/coins";

const CoinIcon = ({
  currency,
  showSymbol = true,
  showTicker = true,
  breakLine = true,
  showLongName,
  className,
}) => {
  const coin = getCoin(currency);
  return (
    <span className={`coin-icon ${className}`}>
      <img
        className="chart-logo"
        src={require("../UI/img/btc-symbol.svg")}
        alt={coin.name}
        title={coin.name}
      />

      {breakLine ? (
        <br />
      ) : (
        <>
          {(showTicker || showLongName) &&
            (showSymbol ? <>&nbsp;&nbsp;</> : "")}
        </>
      )}
      {showTicker && <span className="d-inline">{coin.ticker}</span>}
      {showLongName && <span className="d-inline">{coin.name}</span>}
    </span>
  );
};

export default CoinIcon;
