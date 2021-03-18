import _ from "lodash";
import React, { useState, useEffect } from "react";
import Spinner from "./Spinner";
import ReactDOM from "react-dom";
import { getERC20BalanceOf } from "airswap.js/src/erc20/contractFunctions";

import {
  Grommet,
  Box,
  Heading,
  DataTable,
  Text,
  Button,
  FormField,
  TextInput
} from "grommet";
import Twist from "./twist";
import {
  getAtomicAmountFromDisplayAmount,
  getDisplayAmountFromAtomicAmount,
  getTokenAddressFromSymbol,
  addMarkupToQuotes
} from "./utils";
import Web3 from "web3";
import TransactionButton from "./TransactionButton";
import Gas from "./gas";

const gas = new Gas();

const twist = new Twist(1);

const amountDefault = "1";
const fromDefault = "USDC";
const toDefault = "DAI";
const slippageDefault = 3;

const gasSetting = "fast";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [slippage, setSlippage] = useState(slippageDefault);
  const [web3, setWeb3] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [tokens, setTokens] = useState([]);

  const [fetchingQuotes, setFetchingQuotes] = useState(false);
  const [fetchingTokens, setFetchingTokens] = useState(false);

  const [errorFetchingQuotes, setErrorFetchingQuotes] = useState("");
  const [errorFetchingTokens, setErrorFetchingTokens] = useState("");
  const [fromSymbol, setFromSymbol] = useState(fromDefault);
  const [toSymbol, setToSymbol] = useState(toDefault);
  const [fromAmount, setFromAmount] = useState(amountDefault);
  const [sufficientBalance, setSufficientBalance] = useState(false);

  useEffect(() => {
    window.ethereum
      .enable()
      .then(([address]) => {
        setWeb3(new Web3(window.ethereum));
        setWalletAddress(address);
      })
      .catch(err => setWalletError(err.message));

    setFetchingTokens(true);
    twist.tokensReady
      .then(tokens => {
        setTokens(tokens);
        setFetchingTokens(false);
      })
      .catch(e => {
        setErrorFetchingTokens(e.message);
        setFetchingTokens(false);
      });
  }, []);

  async function fetchQuotes() {
    setFetchingQuotes(true);
    setErrorFetchingQuotes("");

    const sourceToken = await getTokenAddressFromSymbol(fromSymbol, tokens);
    const destinationToken = await getTokenAddressFromSymbol(toSymbol, tokens);
    const sourceAmount = await getAtomicAmountFromDisplayAmount(
      fromAmount,
      sourceToken,
      tokens
    );
    const balance =
      sourceToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ? await web3.eth.getBalance(walletAddress)
        : (await getERC20BalanceOf(sourceToken, walletAddress)).toString();

    const balanceFormatted = getDisplayAmountFromAtomicAmount(
      balance,
      sourceToken,
      tokens
    );
    const sufficientBalance = Number(balanceFormatted) >= Number(fromAmount);
    setSufficientBalance(sufficientBalance);

    const quotesPromise = sufficientBalance
      ? twist.fetchTrades(
          {
            sourceAmount,
            sourceToken,
            destinationToken,
            userAddress: walletAddress,
            slippage
          },
          web3
        )
      : twist.fetchQuotes({
          sourceAmount,
          sourceToken,
          destinationToken
        });

    try {
      await quotesPromise.then(response =>
        setQuotes(addMarkupToQuotes(response))
      );
    } catch (e) {
      setFetchingQuotes(false);
      setErrorFetchingQuotes(e.message);
    }
    setFetchingQuotes(false);
  }

  const tokenSymbols = tokens.map(t => t.symbol);

  const columns = [
    {
      property: "twist",
      primary: true,
      header: "Twist"
    },
    {
      property: "destinationAmount",
      header: "Return Amount",
      sortable: true,
      render: datum => {
        return datum.error ? (
          "N/A"
        ) : (
          <Text>
            {getDisplayAmountFromAtomicAmount(
              datum.destinationAmount,
              datum.destinationToken,
              tokens
            )}{" "}
            {_.get(
              tokens.find(t => datum.destinationToken === t.address),
              "symbol"
            )}
          </Text>
        );
      }
    },
    {
      property: "fetchTime",
      header: "Fetch Time (s)",
      render: datum => {
        return datum.error ? "N/A" : <Text>{datum.fetchTime / 1000}</Text>;
      }
    },
    {
      property: "markup",
      header: "Markup",
      render: datum => {
        return datum.error ? "N/A" : <Text>{datum.markup}</Text>;
      }
    },
    {
      property: "action",
      header: "Action",
      render: datum => {
        if (!sufficientBalance) {
          return datum.error ? (
            <Text size="xsmall">{datum.error.message}</Text>
          ) : (
            "Insufficient Balance"
          );
        }
        return datum.error ? (
          <Text size="xsmall">{datum.error.message}</Text>
        ) : (
          <>
            {datum.approvalNeeded ? (
              <TransactionButton
                transactionFn={async () => {
                  const { gasPrice } = await gas.getGasSettingsForTransaction(
                    gasSetting
                  );
                  const approvalTx = await datum.approvalNeeded({ gasPrice });
                  const approvalPromise = approvalTx.wait();
                  approvalPromise.then(() => fetchQuotes());
                  return approvalPromise;
                }}
                label="Approve Token"
              />
            ) : (
              <TransactionButton
                label="Trade"
                transactionFn={async () => {
                  const { gasPrice } = await gas.getGasSettingsForTransaction(
                    gasSetting
                  );
                  const txObject = {
                    from: walletAddress,
                    to: datum.to,
                    value: datum.value,
                    data: datum.data,
                    gas: 1500000,
                    gasPrice
                  };
                  const result = await web3.eth.sendTransaction(txObject);
                  return result;
                }}
              />
            )}
          </>
        );
      }
    }
  ];

  return (
    <Box pad="large" justify="center" direction="row">
      <Box direction="column">
        <Heading textAlign="center">Twist Twist</Heading>
        {walletError}
        {!fetchingTokens ? (
          <Box align="center" pad="large" direction="column">
            <FormField label="From Amount" htmlFor="from-amount">
              <TextInput
                id="from-amount"
                placeholder="100"
                value={fromAmount}
                onChange={({ target: { value } }) => {
                  setFromAmount(value);
                }}
                onSelect={event => setFromAmount(event.suggestion)}
              />
            </FormField>

            <FormField label="From Token" htmlFor="from-token">
              <TextInput
                id="from-token"
                placeholder="ETH"
                value={fromSymbol}
                onChange={({ target: { value } }) => {
                  setFromSymbol(value.toUpperCase());
                }}
                onSelect={event => setFromSymbol(event.suggestion)}
                suggestions={tokenSymbols.filter(t => t.includes(fromSymbol))}
              />
            </FormField>
            <FormField label="To Token" htmlFor="token-input">
              <TextInput
                id="token-input"
                placeholder="DAI"
                value={toSymbol}
                onChange={({ target: { value } }) => {
                  setToSymbol(value.toUpperCase());
                }}
                onSelect={event => setToSymbol(event.suggestion)}
                suggestions={tokenSymbols.filter(t => t.includes(toSymbol))}
              />
            </FormField>
            <FormField label="Max Slippage %" htmlFor="slippage">
              <TextInput
                id="slippage"
                placeholder="1"
                value={slippage}
                type="number"
                onChange={({ target: { value } }) => {
                  setSlippage(Number(value));
                }}
              />
            </FormField>
          </Box>
        ) : (
          <Box align="center" justify="center" height="300px">
            <Spinner />
          </Box>
        )}

        <Button
          disabled={!(toSymbol && fromSymbol && fromAmount && tokens.length)}
          label="Fetch Quotes"
          primary
          onClick={() => fetchQuotes()}
        />
        <Box align="center" margin="medium">
          {errorFetchingTokens}
          {errorFetchingQuotes}
          {fetchingQuotes && !errorFetchingQuotes ? (
            <Box>
              <Spinner />
            </Box>
          ) : quotes.length ? (
            <DataTable
              data={_.sortBy(quotes, ({ destinationAmount }) =>
                Number(destinationAmount)
              ).reverse()}
              columns={columns}
              sortable
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

const rootElement = document.getElementById("root");

const myTheme = {
  global: {
    font: {
      family: "Lato"
    },
    colors: {
      brand: "#2b71ff",
      focus: "#2b71ff"
    }
  }
};

const Index = () => (
  <Grommet theme={myTheme}>
    <App />
  </Grommet>
);

ReactDOM.render(<Index />, rootElement);
