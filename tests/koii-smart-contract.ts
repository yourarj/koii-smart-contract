import * as anchor from "@project-serum/anchor";
import { Program, Spl } from "@project-serum/anchor";
import { KoiiSmartContract } from "../target/types/koii_smart_contract";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("koii-smart-contract", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .KoiiSmartContract as Program<KoiiSmartContract>;
  const tokenProgram = anchor.Spl.token();
  const myKeypair = anchor.web3.Keypair.generate();
  const mintKeypair = anchor.web3.Keypair.generate();
  console.log("My address ", myKeypair.publicKey.toBase58());
  console.log("Mint address ", mintKeypair.publicKey.toBase58());

  const connection = new anchor.web3.Connection("http://localhost:8899");

  // perform prerequisites for the tests
  before(async () => {
    const airdropTx = await connection.requestAirdrop(
      myKeypair.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropTx);
    const balance = await connection.getBalance(myKeypair.publicKey);
    console.log(
      "Balance of ",
      myKeypair.publicKey.toBase58(),
      " and balance is ",
      balance
    );

    // TODO: (future scope) mint creation with anchor splbundled package

    // create new token (mint)
    const mint = await createMint(
      connection,
      myKeypair,
      myKeypair.publicKey,
      myKeypair.publicKey,
      18
    );

    // create associated token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      myKeypair,
      mint,
      myKeypair.publicKey
    );

    // mint tokens to send to the bouty account
    await mintTo(
      connection,
      myKeypair,
      mint,
      tokenAccount.address,
      myKeypair.publicKey,
      100
    );
  });

  it("Is initialized!", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction", tx);
  });
});
