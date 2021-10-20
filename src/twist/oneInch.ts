import _ from "lodash";
import axios from "axios";
import qs from "query-string";

import {
  QuoteRequest,
  QuoteResponse,
  TradeRequest,
  TradeResponse
} from "./types";

const ONE_INCH_BASE_URL = "https://api.1inch.exchange/v2.0";

// fetchTokens types
interface Token {
  decimals: number;
  symbol: string;
  address: string;
}

interface TokenResponse {
  [key: string]: Token;
}

// fetchQuote types

interface OneInchQuote {
  fromToken: Token;
  toToken: Token;
  toTokenAmount: string;
  fromTokenAmount: string;
  exchanges: Array<{ name: string; part: number }>;
}

interface OneInchSwapQuote {
  fromToken: Token;
  toToken: Token;
  toTokenAmount: string;
  fromTokenAmount: string;
  exchanges: Array<{ name: string; part: number }>;
  from: string;
  to: string;
  data: string;
  value: string;
}

class OneInch {
  tokensReady: Promise<Token[]>;
  constructor(network: number) {
    if (network !== 1) {
      throw new Error("only mainnet is supported");
    }
    this.tokensReady = this.fetchTokens();
  }
  async fetchTokens(): Promise<Token[]> {
    const tokenResponse: TokenResponse = await axios
      .get(`${ONE_INCH_BASE_URL}/tokens`)
      .then(resp => resp.data);
    return _.values(tokenResponse).map(t => ({
      ...t,
      address: t.address.toLowerCase()
    }));
  }
  async fetchQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
    const { sourceToken, destinationToken, sourceAmount } = quoteRequest;
    const quote: OneInchQuote = await axios
      .get(
        `${ONE_INCH_BASE_URL}/quote?fromTokenAddress=${sourceToken}&toTokenAddress=${destinationToken}&amount=${sourceAmount}&disableEstimate=false&slippage=1`
      )
      .then(resp => resp.data);

    return {
      sourceToken,
      destinationToken,
      sourceAmount,
      destinationAmount: quote.toTokenAmount
    };
  }
  async fetchTrade({
    sourceToken,
    destinationToken,
    sourceAmount,
    userAddress,
    slippage
  }: TradeRequest): Promise<TradeResponse> {
    const query = {
      fromTokenAddress: sourceToken,
      toTokenAddress: destinationToken,
      amount: sourceAmount,
      fromAddress: userAddress,
      slippage,
      disableEstimate: true
    };
    const quote: OneInchSwapQuote = await axios
      .get(`${ONE_INCH_BASE_URL}/swapQuote?${qs.stringify(query)}`)
      .then(resp => resp.data);

    const { to, data, value, toTokenAmount } = quote;

    return {
      sourceToken,
      destinationToken,
      sourceAmount,
      destinationAmount: toTokenAmount,
      to,
      data,
      value,
      from: userAddress
    };
  }
}

export default OneInch;
