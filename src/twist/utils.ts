const ethAddressByTwist: { [key: string]: string } = {
  paraswap: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  oneInch: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  totle: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  dexag: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  zeroEx: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
};

function normalizeRequestTokens({ sourceToken, destinationToken }: { sourceToken: string, destinationToken: string }, aggKey: string) {
  const fixEth = (address: string) =>
    address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      ? ethAddressByTwist[aggKey]
      : address;

  return {
    sourceToken: fixEth(sourceToken),
    destinationToken: fixEth(destinationToken)
  };
}

function normalizeResponseTokens({ sourceToken, destinationToken }: { sourceToken: string, destinationToken: string }, aggKey: string) {
  const fixEth = (address: string) =>
    address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      : address;

  return {
    sourceToken: fixEth(sourceToken),
    destinationToken: fixEth(destinationToken)
  };
}

export { normalizeRequestTokens, normalizeResponseTokens };
