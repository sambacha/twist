export interface QuoteRequest {
  sourceToken: string;
  destinationToken: string;
  sourceAmount: string;
}

export interface QuoteResponse {
  sourceToken: string;
  destinationToken: string;
  sourceAmount: string;
  destinationAmount: string;
  error?: string;
}

export interface Token {
  decimals: number;
  symbol: string;
  address: string;
}

export interface Twist {
  network?: number;
  tokensReady: Promise<Token[]>;
  fetchTokens: () => Promise<Token[]>;
  fetchQuote: (x: QuoteRequest) => Promise<QuoteResponse>;
  fetchTrade: (x: TradeRequest) => Promise<TradeResponse>;
}

export interface TradeRequest extends QuoteRequest {
  userAddress: string;
  slippage: number;
}

export interface TradeResponse extends QuoteResponse {
  from: string;
  to: string;
  value: string;
  data: string;
  // chainId: number;
  // gasPrice: string;
  // gas: number;
}
