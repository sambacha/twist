// @ts-nocheck
import axios from "axios";
import {
  QuoteRequest,
  QuoteResponse,
  TradeRequest,
  TradeResponse
} from "./types";
import bn from "bignumber.js";

const DEXAG_BASE_URL = "https://api-v2.dex.ag";

// fetchTokens types
interface Token {
  decimals: number;
  symbol: string;
  address: string;
}
// fetchQuote types

interface DexagQuote {
  dex: string;
  price: string;
  pair: {
    base: string;
    quote: string;
  };
  liquidity: {
    [key: string]: number;
  };
}

const x = {
  trade: {
    to: "0x745DAA146934B27e3f0b6bff1a6e36b9B90fb131",
    data:
      "0x5d46ec34000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000002e00000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000006300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000818e6fecd516ecc3849daf6845e3ec868087b7550000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4cb3c28c7000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000745daa146934b27e3f0b6bff1a6e36b9b90fb131800000000000016c889a28c160ce0422bb9138ff1d4e482740000000000000000000000000000000000000000000000000000000000000000dbd89cdc19d4ef800000000000000000000000092c1f48ad7ef2ae00801620325af996f843293a3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000005af3107a4000",
    value: "100000000000000"
  },
  metadata: {
    source: {
      dex: "ag",
      price: "207.0869659999996272",
      liquidity: {
        kyber: 100
      }
    },
    query: {
      from: "ETH",
      to: "USDC",
      fromAmount: "0.0001",
      limitAmount: "0.00009900990099009902",
      dex: "ag"
    }
  }
};

interface DexagTrade {
  trade: {
    to: string;
    data: string;
    value: string;
  };
  metadata: {
    source: {
      dex: string;
      price: string;
      liquidity: {
        [key: string]: number;
      };
    };
    query: {
      from: string;
      to: string;
      fromAmount: string;
      limitAmount: string;
      dex: string;
    };
  };
}

class DexAg {
  tokensReady: Promise<Token[]>;
  constructor(network: number) {
    if (network !== 1) {
      throw new Error("only mainnet is supported");
    }
    this.tokensReady = this.fetchTokens();
  }
  fetchTokens(): Promise<Token[]> {
    return axios
      .get(`${DEXAG_BASE_URL}/token-list-full`)
      .then(resp =>
        resp.data.map((t:any) => ({ ...t, address: t.address.toLowerCase() }))
      );
  }
  async fetchDexagQuote({
    sourceSymbol,
    destinationSymbol,
    sourceAmountFormatted
  }: any) {
    let query = `${DEXAG_BASE_URL}/price?from=${sourceSymbol}&to=${destinationSymbol}&fromAmount=${sourceAmountFormatted}&dex=ag`;

    const quote: DexagQuote = await axios.get(query).then(resp => resp.data);

    const destinationAmountFormatted =
      sourceAmountFormatted * Number(quote.price);
    return {
      sourceSymbol,
      destinationSymbol,
      sourceAmountFormatted,
      destinationAmountFormatted
    };
  }
  async fetchDexagTrade({
    sourceSymbol,
    destinationSymbol,
    sourceAmountFormatted,
    slippage
  }: any) {
    const limitAmount = Number(sourceAmountFormatted) / (1 + slippage / 100);
    let query = `${DEXAG_BASE_URL}/trade?from=${sourceSymbol}&to=${destinationSymbol}&fromAmount=${sourceAmountFormatted}&limitAmount=${limitAmount}&dex=ag`;

    const {
      trade: { to, data, value },
      metadata: {
        source: { price }
      }
    }: DexagTrade = await axios.get(query).then(resp => resp.data);

    const destinationAmountFormatted = sourceAmountFormatted * Number(price);
    return {
      sourceSymbol,
      destinationSymbol,
      sourceAmountFormatted,
      destinationAmountFormatted,
      to,
      data,
      value
    };
  }
  async getTokenSymbolFromAddress(tokenAddress: string) {
    const tokens = await this.tokensReady;
    const token = tokens.find(
      ({ address }) => address.toLowerCase() === tokenAddress.toLowerCase()
    );
    if (!token) {
      throw new Error(`Token ${tokenAddress} not supported`);
    }
    return token.symbol;
  }
  async getAtomicAmountFromDisplayAmount(amount: string, tokenAddress: string): Promise<string> {
    const tokens = await this.tokensReady;
    // @ts-ignore
    const { decimals } = tokens.find(
      ({ address }) => address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return new bn(amount).times(10 ** decimals).toString();
  }
  async getDisplayAmountFromAtomicAmount(amount: string, tokenAddress: string): Promise<string> {
    const tokens = await this.tokensReady;
    // @ts-ignore
    const { decimals } = tokens.find(
      ({ address }) => address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return (Number(amount) / 10 ** decimals).toString();
  }
  async fetchQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
    const { sourceToken, destinationToken, sourceAmount } = quoteRequest;

    const sourceSymbol = await this.getTokenSymbolFromAddress(sourceToken);
    const destinationSymbol = await this.getTokenSymbolFromAddress(
      destinationToken
    );
    const sourceAmountFormatted = await this.getDisplayAmountFromAtomicAmount(
      sourceAmount,
      sourceToken
    );
    const quote = await this.fetchDexagQuote({
      sourceSymbol,
      destinationSymbol,
      sourceAmountFormatted
    });
    const destinationAmount = await this.getAtomicAmountFromDisplayAmount(
      quote.destinationAmountFormatted.toString(),
      destinationToken
    );

    return {
      sourceToken,
      destinationToken,
      sourceAmount,
      destinationAmount
    };
  }
  async fetchTrade({
    sourceToken,
    destinationToken,
    sourceAmount,
    userAddress,
    slippage
  }: TradeRequest): Promise<TradeResponse> {
    const sourceSymbol = await this.getTokenSymbolFromAddress(sourceToken);
    const destinationSymbol = await this.getTokenSymbolFromAddress(
      destinationToken
    );
    const sourceAmountFormatted = await this.getDisplayAmountFromAtomicAmount(
      sourceAmount,
      sourceToken
    );
    const {
      destinationAmountFormatted,
      to,
      data,
      value
    } = await this.fetchDexagTrade({
      sourceSymbol,
      destinationSymbol,
      sourceAmountFormatted,
      slippage
    });

    const destinationAmount = await this.getAtomicAmountFromDisplayAmount(
      destinationAmountFormatted.toString(),
      destinationToken
    );

    return {
      sourceToken,
      destinationToken,
      sourceAmount,
      destinationAmount,
      from: userAddress,
      to,
      data,
      value
    };
  }
}

export default DexAg;
