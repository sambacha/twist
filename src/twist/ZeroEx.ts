import axios from "axios";
import qs from "query-string";
import {
  QuoteRequest,
  QuoteResponse,
  TradeRequest,
  TradeResponse
} from "./types";

const ZERO_EX_BASE_URL = "https://api.0x.org";

// fetchTokens types
interface Token {
  decimals: number;
  symbol: string;
  address: string;
}

interface TokenResponse {
  records: Token[];
}

// fetchQuote types
interface ZeroExQuote {
  price: string;
  guaranteedPrice: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
  protocolFee: string;
  buyTokenAddress: string;
  sellTokenAddress: string;
  buyAmount: string;
  sellAmount: string;
  sources: Array<{ name: string; proportion: string }>;
}

class ZeroEx {
  tokensReady: Promise<Token[]>;
  constructor(network: number) {
    if (network !== 1) {
      throw new Error("only mainnet is supported");
    }
    this.tokensReady = this.fetchTokens();
  }
  async fetchTokens(): Promise<Token[]> {
    const tokenResponse: TokenResponse = await axios
      .get(`${ZERO_EX_BASE_URL}/swap/v0/tokens`)
      .then(resp => resp.data);

    return tokenResponse.records.map(t => ({
      ...t,
      address: t.address.toLowerCase()
    }));
  }
  async fetchQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
    const { sourceToken, destinationToken, sourceAmount } = quoteRequest;

    try {
      const queryString = qs.stringify({
        sellToken: sourceToken,
        buyToken: destinationToken,
        sellAmount: sourceAmount
      });
      const quote: ZeroExQuote = await axios
        .get(`${ZERO_EX_BASE_URL}/swap/v0/quote?${queryString}`)
        .then(resp => resp.data);

      return {
        sourceToken,
        destinationToken,
        sourceAmount,
        destinationAmount: quote.buyAmount
      };
    } catch (error) {
      return {
        sourceToken,
        destinationToken,
        sourceAmount,
        destinationAmount: "0",
        error
      };
    }
  }
  async fetchTrade({
    sourceToken,
    destinationToken,
    sourceAmount,
    userAddress,
    slippage
  }: TradeRequest): Promise<TradeResponse> {
    const queryString = qs.stringify({
      sellToken: sourceToken,
      buyToken: destinationToken,
      sellAmount: sourceAmount,
      // takerAddress: userAddress,
      slippagePercentage: slippage / 100 // 0x defines slippage as a decimal between 0 and 1
    });
    const quote: ZeroExQuote = await axios
      .get(`${ZERO_EX_BASE_URL}/swap/v0/quote?${queryString}`)
      .then(resp => resp.data);

    const { to, data, value } = quote;

    return {
      sourceToken,
      destinationToken,
      sourceAmount,
      destinationAmount: quote.buyAmount,
      from: userAddress,
      to,
      data,
      value
    };
  }
}

export default ZeroEx;
