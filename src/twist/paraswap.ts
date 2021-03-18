import axios from "axios";
import bn from "bignumber.js";
import {
  QuoteRequest,
  QuoteResponse,
  Token,
  TradeRequest,
  TradeResponse
} from "./types";

const PARASWAP_BASE_URL = "https://paraswap.io/api/v1";

// fetchPrices types

interface Route {
  exchange: string;
  percent: string;
  srcAmount: string;
  amount: string;
  data: {
    exchange: string;
    tokenFrom: string;
    tokenTo: string;
  };
}

interface Other {
  exchange: string;
  rate: string;
  unit: string;
}

interface ParaswapPricesResponse {
  priceRoute: {
    amount: string;
    bestRoute: Route[];
    others: Other[];
  };
}

interface TransactionRequest {
  priceRoute: any;
  srcToken: string;
  destToken: string;
  srcAmount: string;
  destAmount: string;
  userAddress: string;
  payTo: string;
  referrer: string;
}

class Paraswap {
  tokensReady: Promise<Token[]>;
  network: number;
  constructor(network: number) {
    this.network = network;
    this.tokensReady = this.fetchTokens();
  }
  async fetchTokens(): Promise<Token[]> {
    const tokensResponse: { tokens: Token[] } = await axios
      .get(`${PARASWAP_BASE_URL}/tokens/${this.network}`)
      .then(resp => resp.data);

    return tokensResponse.tokens.map(t => ({
      ...t,
      address: t.address.toLowerCase()
    }));
  }
  _fetchParaswapPrices({
    sourceToken,
    destinationToken,
    sourceAmount
  }: QuoteRequest): Promise<ParaswapPricesResponse> {
    return axios
      .get(
        `${PARASWAP_BASE_URL}/prices/${
          this.network
        }/${sourceToken}/${destinationToken}/${sourceAmount}`
      )
      .then(resp => resp.data);
  }
  async fetchQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
    const { sourceToken, destinationToken, sourceAmount } = quoteRequest;

    const paraswapPrices = await this._fetchParaswapPrices({
      sourceToken,
      destinationToken,
      sourceAmount
    });

    return {
      sourceToken,
      destinationToken,
      sourceAmount,
      destinationAmount: paraswapPrices.priceRoute.amount
    };
  }
  async fetchTrade({
    sourceToken,
    destinationToken,
    sourceAmount,
    userAddress,
    slippage
  }: TradeRequest): Promise<TradeResponse> {
    const bestPrice = await this._fetchParaswapPrices({
      sourceToken,
      destinationToken,
      sourceAmount
    });

    const slippageCalc = 1 + slippage / 100;
    const newDestinationAmount = new bn(bestPrice.priceRoute.amount)
      .div(slippageCalc)
      .toString();
    const transactionRequest: TransactionRequest = {
      priceRoute: bestPrice.priceRoute,
      srcToken: sourceToken,
      destToken: destinationToken,
      srcAmount: sourceAmount,
      destAmount: newDestinationAmount,
      userAddress,
      referrer: "airswap.io",
      payTo: ""
    };
    const transactionResponse = await axios
      .post(
        `${PARASWAP_BASE_URL}/transactions/${this.network}`,
        transactionRequest
      )
      .then(resp => resp.data);
    const { from, to, value, data } = transactionResponse;
    return {
      from,
      to,
      value,
      data,
      sourceToken,
      destinationToken,
      sourceAmount,
      destinationAmount: bestPrice.priceRoute.amount
    };
  }
}

export default Paraswap;
