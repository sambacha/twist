# `twist-lib`

### overview

A demo application that utilizes this library [can be found here](https://codesandbox.io/s/agg-agg-il5md)

### usage 

> instance is created by passing in the network id to the constructor.

```javascript
import Twist from "./index";
const twist = new Twist(1);
```
Each twist has it's own class in this directory, and each twistor fetches its own token metadata and returns it to the main class.
Once all token metadata has been loaded the  `twist.tokens` Ready promise resolves and the library is ready to be interacted with.

There are two ways the lib can be used, to fetch quotes, and to fetch trades. 
- Quotes are just prices. They don't require a web3 instance, or a wallet address, and they can be used for price discovery for arbitrarily large amounts.
- Trades are executable. They require a web3 provider and slippage parameters to be set. 


This is the syntax for fetching quotes:

```javascript
twist.fetchQuotes({
          sourceAmount,
          sourceToken,
          destinationToken
        })
```

This is the syntax for fetching trades:

```javascript
twist.fetchTrades(
          {
            sourceAmount,
            sourceToken,
            destinationToken,
            userAddress,
            slippage
          },
          web3
        )
```

When a trade is fetched, the appropriate approvals are also checked for the `userAddress` address provided.
If approvals are missing, they are added as an `approvalNeeded` param to each individual trade returned.

To execute an approval transaction 

```javascript
const approvalTx = await trade.approvalNeeded({ gasPrice });
const approvalReceipt = await approvalTx.wait();
                  
```

To execute a trade transaction 
```javascript
const txObject = {
                    from: walletAddress,
                    to: trade.to,
                    value: trade.value,
                    data: trade.data,
                    gas,
                    gasPrice
                  };
web3.eth.sendTransaction(txObject);

```

## Usage notes
- Since ETH itself is not a token, an address must be chosen to represent it as an asset. Some twists choose `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` and some choose `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`. This library uses `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`, and translates to the appropriate representation for the twist when making a request.
- Each twist has a different method of approving the end user's ERC20 balance. Many utilize an ERC20 proxy that handles the authorizations. That's why it's important to use the libraries built-in approval checks instead of manually checking the `trade.to` address for the spender approval.

This library is a work in progress. Feel free to pull it down, and play with it. But it is liable to have significant breaking changes. The future plan is to implement it as a module which can be installed through NPM.
