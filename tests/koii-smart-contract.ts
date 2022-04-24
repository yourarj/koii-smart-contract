import * as anchor from "@project-serum/anchor";
import { Program, Spl, web3 } from "@project-serum/anchor";
import { KoiiSmartContract } from "../target/types/koii_smart_contract";
import {
  AccountLayout,
  createMint,
  getOrCreateAssociatedTokenAccount,
  createInitializeAccountInstruction,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

describe("koii-smart-contract", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .KoiiSmartContract as Program<KoiiSmartContract>;
  const tokenProgram = anchor.Spl.token();
  const myKeypair = web3.Keypair.generate();
  const mintKeypair = web3.Keypair.generate();
  console.log("My address ", myKeypair.publicKey.toBase58());
  console.log("Mint address ", mintKeypair.publicKey.toBase58());

  const connection = new web3.Connection("http://localhost:8899");
  // const connection = new web3.Connection(web3.clusterApiUrl("devnet"));

  // perform prerequisites for the tests
  before(async () => {
    console.log(new Date(), "requesting airdrop");
    const airdropTx = await connection.requestAirdrop(
      myKeypair.publicKey,
      5 * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropTx);

    console.log(new Date(), "fetching balance after airdrop");
    const balance = await connection.getBalance(myKeypair.publicKey);
    console.log(
      new Date(),
      "Balance of",
      myKeypair.publicKey.toBase58(),
      "and balance is",
      balance
    );

    // TODO: (future scope) mint creation with anchor splbundled package

    // create new token (mint)

    console.log(new Date(), "creating new token mint account");
    const mint = await createMint(
      connection,
      myKeypair,
      myKeypair.publicKey,
      myKeypair.publicKey,
      18,
      mintKeypair
    );

    // create associated token account
    console.log(
      new Date(),
      "creating new token associated token account of mint",
      mint.toBase58()
    );
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      myKeypair,
      mint,
      myKeypair.publicKey
    );

    // mint tokens to send to the bouty account
    console.log(new Date(), "minting some tokens");
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
    console.log(new Date(), "Is initialize started");
    const bountyAccount = web3.Keypair.generate();

    // create bounty token account IX
    const createBountyAccountIx = web3.SystemProgram.createAccount({
      programId: TOKEN_PROGRAM_ID,
      space: AccountLayout.span,
      lamports: await connection.getMinimumBalanceForRentExemption(
        AccountLayout.span,
        "confirmed"
      ),
      fromPubkey: myKeypair.publicKey,
      newAccountPubkey: bountyAccount.publicKey,
    });

    // init token account IX
    const initTempAccountIx = createInitializeAccountInstruction(
      bountyAccount.publicKey,
      mintKeypair.publicKey,
      myKeypair.publicKey,
      TOKEN_PROGRAM_ID
    );

    const tokenAccountInitTx = new web3.Transaction();
    tokenAccountInitTx.add(createBountyAccountIx);
    tokenAccountInitTx.add(initTempAccountIx);
    tokenAccountInitTx.feePayer = myKeypair.publicKey;

    // initializing new bounty token account with tx
    console.log(new Date(), "Initializing new bounty account");
    const txSig = await connection.sendTransaction(tokenAccountInitTx, [
      bountyAccount,
      myKeypair,
    ]);
    await connection.confirmTransaction(txSig);

    console.log(
      new Date(),
      "finding . Current program is:",
      program.programId.toBase58()
    );
    let [pda, bump] = await findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("task_v0")),
        myKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    console.log(new Date(), "Invoking initialize");
    const tx = await program.methods
      .initialize()
      .accounts({
        bountyAccount: bountyAccount.publicKey,
        taskAccount: pda,
        bootstraper: myKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([myKeypair])
      .rpc();
    console.log("Your transaction", tx);
  });
});
