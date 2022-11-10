import React, { useEffect, useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import kp from './keypair.json';
import './App.css';

const { SystemProgram } = web3;

// Smart Contract Connection
const programID = new PublicKey('A8g3YSrKeLWfPmV6CnrQov4qrb6uH7A3V6pcyuuBVkLc');
const network = clusterApiUrl('devnet');
const opts = {
  preflightCommitment: "processed"
}

// Keypair default
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseCounter = web3.Keypair.fromSecretKey(secret)

const App = () => {

  // States
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [imageList, setImageList] = useState([]);


  /* ********** UI Functions ********** */

  const renderConnectedContainer = () => {
    if (imageList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createImageAccount}>
            Do One-Time Initialization For Image Program Account
          </button>
        </div>
      )
    }
    else {
      return(
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendImage();
            }}
          >
            <input
              type="text"
              placeholder="Enter image link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.urlImage */}
            {imageList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.urlImage} />
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };


  /* ********** Wallet Connection ********** */

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const checkIfWalletIsConnected = async () => {
    if (window?.solana?.isPhantom) {
      console.log('Phantom wallet found!');
      const response = await window.solana.connect({ onlyIfTrusted: true });
      console.log(
        'Connected with Public Key:',
        response.publicKey.toString()
      );
      setWalletAddress(response.publicKey.toString());
    } else {
      alert('Solana object not found! Get a Phantom Wallet 👻');
    }
  };


  /* ********** Solana Transactions ********** */

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const getProgram = async () => {
    const provider = getProvider();
    const idl = await Program.fetchIdl(programID, provider);
    return new Program(idl, programID, getProvider());
  };

  const createImageAccount = async () => {
    try {
      const provider = getProvider();
      const program = await getProgram();

      console.log("Initialice user's account")
      await program.rpc.createCounter({
        accounts: {
          baseCounter: baseCounter.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseCounter]
      });
      console.log("Created a new BaseCounter w/ address:", baseCounter.publicKey.toString())
      await getImageList();

    } catch(error) {
      console.log("Error creating BaseCounter account:", error)
    }
  }

  const sendImage = async () => {
    if (inputValue.length === 0) {
      console.log("No image link given!")
      return
    }
    setInputValue('');
    console.log('Image link:', inputValue);
    try {
      const provider = getProvider()
      const program = await getProgram();

      await program.rpc.counterAdd(inputValue, {
        accounts: {
          baseCounter: baseCounter.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Image successfully sent to program", inputValue)

      await getImageList();
    } catch (error) {
      console.log("Error sending Image:", error)
    }
  }

  const getImageList = async() => {
    try {
      const program = await getProgram();
      const account = await program.account.baseCounter.fetch(baseCounter.publicKey);

      console.log("Got the account", account)
      setImageList(account.imageList)

    } catch (error) {
      console.log("Error in getImageList: ", error)
      setImageList(null);
    }
  }


  /* ********** EFFECTS ********** */

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching Image list...');
      getImageList()
    }
  }, [walletAddress]);


  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 Pink Floyd Portal</p>
          <p className="sub-text">
            View your Pink Floyd collection in Solana ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          {/* ...*/}
        </div>
      </div>
    </div>
  );
};

export default App;
