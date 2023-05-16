require("dotenv").config();
const axios = require("axios");

const CRYPTOCOMPARE_REST_BASE_URL = process.env.CRYPTOCOMPARE_REST_BASE_URL;

const baseRequest = async (url, headers = {}, method = "GET", data = {}) => {
  const req = { url, method, data, headers };

  try {
    const response = await axios(req);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(error.response.data);
      console.error(error.response.status);
      console.error(error.response.headers);
    } else if (error.request) {
      console.error(error.request);
    } else {
      console.error("Error", error.message);
    }
    throw new Error(`Request failed, url: ${url}`);
  }
};

const requestV3 = async ({
  path,
  authPath = null,
  method = "GET",
  data = {},
}) => {
  return await baseRequest(CRYPTOCOMPARE_REST_BASE_URL + path, method);
};

const getPrice = async (currencyFrom, currencyTo) => {
  const REQUEST_PRICE = `data/price?fsym=${currencyFrom}&tsyms=${currencyTo}`;

  try {
    return await requestV3({ path: REQUEST_PRICE });
  } catch (error) {
    console.error("price", error);
    return {};
  }
};

module.exports = {
  getPrice,
};
