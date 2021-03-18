import { checkApproval, getERC20Contract } from "airswap.js/src/erc20";
import { TOKEN_APPROVAL_AMOUNT } from "airswap.js/src/constants";
import * as ethers from "ethers";
import { getContractAddressesForChainOrThrow } from "@0x/contract-addresses";
import _ from "lodash";
import Paraswap from "./paraswap";
import OneInch from "./oneInch";
import Totle from "./totle";
import Dexag from "./dexag";
import ZeroEx from "./ZeroEx";

import {
  QuoteRequest,
  QuoteResponse,
  Aggregator,
  Token,
  TradeRequest,
  TradeResponse
} from "./types";
import { normalizeRequestTokens, normalizeResponseTokens } from "./utils";
import Web3 from "web3";

function approveToken(tokenAddress: string, spender: string, signer: any, options = {}) {
  const contract = getERC20Contract(tokenAddress, signer);
  return contract.approve(spender, TOKEN_APPROVAL_AMOUNT, { ...options });
}

interface AggregatedQuoteResponse extends QuoteResponse {
  fetchTime: number;
  aggregator: string;
}

interface AggregatedTradeResponse extends TradeResponse {
  fetchTime: number;
  aggregator: string;
}

const ETH: Token = {
  symbol: "ETH",
  decimals: 18,
  address: "0x0000000000000000000000000000000000000000"
};

class AggregatorAggregator {
  network: number;
  aggregators: { [key: string]: Aggregator };
  tokensReady: Promise<Token[]>;
  constructor(network: number) {
    this.network = network;
    this.aggregators = {
      paraswap: new Paraswap(this.network),
      oneInch: new OneInch(this.network),
      totle: new Totle(this.network),
      dexag: new Dexag(this.network),
      zeroEx: new ZeroEx(this.network)
    };
    this.tokensReady = this.processTokensReadyPromises();
  }
  async processTokensReadyPromises(): Promise<Token[]> {
    const keys = Object.keys(this.aggregators);
    const tokensArray = await Promise.all(
      keys.map(async aggKey => {
        return this.aggregators[aggKey].fetchTokens();
      })
    );

    const tokensCleaned = tokensArray.map(tokens =>
      tokens.map(token => ({
        ...token,
        address: token.address.toLowerCase()
      }))
    );

    const tokenAddressesArray: Array<Array<string>> = tokensCleaned.map(tokens =>
      tokens.map(token => token.address)
    );

    const commonAddresses: Array<string> = _.union(...tokenAddressesArray);
    const commonTokens: Array<Token> = _.compact(commonAddresses.map(address => {
      return _.find(_.flatten(tokensCleaned), t => t.address === address);
    }))

    const combinedTokens = [ETH, ...commonTokens.filter(t => t.symbol !== "ETH")]

    return _.uniqBy(
      combinedTokens,
      "address"
    );
  }
  async validateRequestTokensForAgg({ sourceToken, destinationToken }: { sourceToken: string, destinationToken: string }, aggKey: string) {
    const tokens = await this.aggregators[aggKey].tokensReady;

    if (!_.find(tokens, { address: sourceToken })) {
      throw new Error(`Source token not supported`);
    } else if (!_.find(tokens, { address: destinationToken })) {
      throw new Error(`Destination token not supported`);
    }
  }
  async fetchTrades(
    {
      sourceToken,
      destinationToken,
      sourceAmount,
      userAddress,
      slippage
    }: TradeRequest,
    web3: Web3
  ): Promise<AggregatedTradeResponse[]> {
    const keys = Object.keys(this.aggregators);
    const trades = await Promise.all(
      keys.map(async aggKey => {
        const startTime = Date.now();
        let quote;
        try {
          const normalizedRequest = {
            sourceAmount,
            userAddress,
            slippage,
            ...normalizeRequestTokens(
              {
                sourceToken,
                destinationToken
              },
              aggKey
            )
          };
          await this.validateRequestTokensForAgg(normalizedRequest, aggKey);
          const quoteResponse = await this.aggregators[aggKey].fetchTrade(
            normalizedRequest
          );
          quote = {
            ...quoteResponse,
            ...normalizeResponseTokens(
              {
                sourceToken: quoteResponse.sourceToken,
                destinationToken: quoteResponse.destinationToken
              },
              aggKey
            )
          };
        } catch (error) {
          quote = {
            sourceToken,
            destinationToken,
            sourceAmount,
            error
          };
        }

        return {
          ...quote,
          fetchTime: Date.now() - startTime,
          aggregator: aggKey
        };
      })
    );
    const approvals = await this.checkApprovals(trades, web3);

    return trades.map((trade, i) => ({
      ...trade,
      approvalNeeded: approvals[i]
    }));
  }
  async checkApprovals(trades: any, web3: any) {
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    const signer = provider.getSigner();
    const approvalsNeeded = await Promise.all(
      trades.map(async (trade: any) => {
        if (trade.sourceToken === ETH.address || trade.error) {
          return null;
        }
        const spender = (N => {
          switch (N) {
            case "zeroEx":
              return getContractAddressesForChainOrThrow(1).erc20Proxy;
            case "totle":
              return "0x74758acfce059f503a7e6b0fc2c8737600f9f2c4";
            case "oneInch":
              return "0xe4c9194962532feb467dce8b3d42419641c6ed2e";
            case "dexag":
              return "0xccaf8533b6822a6c17b1059dda13c168e75544a4";
            default:
              return trade.to;
          }
        })(trade.aggregator);

        const isApproved = await checkApproval(
          trade.sourceToken,
          spender,
          signer
        );

        if (!isApproved) {
          return (options = {}) =>
            approveToken(trade.sourceToken, spender, signer, options);
        } else {
          return null;
        }
      })
    );
    return approvalsNeeded;
  }
  async fetchQuotes({
    sourceToken,
    destinationToken,
    sourceAmount
  }: QuoteRequest): Promise<AggregatedQuoteResponse[]> {
    const keys = Object.keys(this.aggregators);
    return Promise.all(
      keys.map(async aggKey => {
        const startTime = Date.now();
        let quote;
        try {
          const normalizedRequest = {
            sourceAmount,
            ...normalizeRequestTokens(
              {
                sourceToken,
                destinationToken
              },
              aggKey
            )
          };
          await this.validateRequestTokensForAgg(normalizedRequest, aggKey);
          const quoteResponse = await this.aggregators[aggKey].fetchQuote(
            normalizedRequest
          );
          quote = {
            ...quoteResponse,
            ...normalizeResponseTokens(
              {
                sourceToken: quoteResponse.sourceToken,
                destinationToken: quoteResponse.destinationToken
              },
              aggKey
            )
          };
        } catch (error) {
          quote = {
            sourceToken,
            destinationToken,
            sourceAmount,
            error
          };
        }

        return {
          ...quote,
          fetchTime: Date.now() - startTime,
          aggregator: aggKey
        };
      })
    );
  }
}

export default AggregatorAggregator;
