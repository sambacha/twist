import _ from 'lodash'
import bn from "bignumber.js";
import {QuoteResponse, Token} from "./twist/types";

bn.config({ EXPONENTIAL_AT: 1e9 });

export function getTokenAddressFromSymbol(tokenSymbol: string, tokens: Array<Token>) {
  return _.get(tokens.find(({ symbol }) => symbol === tokenSymbol), 'address');
}

export function getAtomicAmountFromDisplayAmount(amount, tokenAddress, tokens) {
  const { decimals } = tokens.find(
    ({ address }) => address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return new bn(amount).times(10 ** decimals).toString();
}

export function getDisplayAmountFromAtomicAmount(amount, tokenAddress, tokens) {
  const token = tokens.find(
    ({ address }) => address.toLowerCase() === tokenAddress.toLowerCase()
  );
  const { decimals } = token;

  return new bn(amount).dividedBy(10 ** decimals).toFixed(4);
}

export function addMarkupToQuotes(quotes: QuoteResponse[]) {
  const highestDestinationAmount = quotes.reduce((agg, quote): number => {
    if (Number(quote.destinationAmount) > agg) {
      return Number(quote.destinationAmount);
    } else {
      return agg;
    }
  }, 0);
  return quotes.map(quote => {
    const markup =
      highestDestinationAmount / Number(quote.destinationAmount) - 1;
    const markupPercentage = (markup * 100).toFixed(2);
    return {
      ...quote,
      markup: `+ ${markupPercentage}%`
    };
  });
}
