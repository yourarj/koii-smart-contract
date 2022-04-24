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
  getAssociatedTokenAddress,
  RawAccount,
} from "@solana/spl-token";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { assert } from "chai";

const fetchDecodeTokenAccount = async (
  accountPublicKey: anchor.web3.PublicKey,
  provider: anchor.Provider
): Promise<[RawAccount, string]> => {
  const tokenInfoLol = await provider.connection.getAccountInfo(
    accountPublicKey
  );
  const data = Buffer.from(tokenInfoLol.data);
  const rawAccount: RawAccount = AccountLayout.decode(data);

  const amount = rawAccount.amount;
  return [rawAccount, amount.toString()];
};

describe("Task Tests: koii-smart-contract", () => {
  const localAnchorProvider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(localAnchorProvider);

  const program = anchor.workspace
    .KoiiSmartContract as Program<KoiiSmartContract>;
  const taskSubmitterKeypair = web3.Keypair.generate();
  const taskWorkerKeypair = web3.Keypair.generate();
  const mintKeypair = web3.Keypair.generate();
  console.log("My address ", taskSubmitterKeypair.publicKey.toBase58());
  console.log("Mint address ", mintKeypair.publicKey.toBase58());

  const connection = anchor.getProvider().connection;
  // const connection = new web3.Connection(web3.clusterApiUrl("devnet"));

  // perform prerequisites for the tests
  before(async () => {
    console.log(new Date(), "requesting airdrop");
    const airdropTx = await connection.requestAirdrop(
      taskSubmitterKeypair.publicKey,
      5 * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropTx);

    console.log(new Date(), "fetching balance after airdrop");
    const balance = await connection.getBalance(taskSubmitterKeypair.publicKey);
    console.log(
      new Date(),
      "Balance of",
      taskSubmitterKeypair.publicKey.toBase58(),
      "and balance is",
      balance
    );

    // TODO: (future scope) mint creation with anchor splbundled package

    // create new token (mint)

    console.log(new Date(), "creating new token mint account");
    const mint = await createMint(
      connection,
      taskSubmitterKeypair,
      taskSubmitterKeypair.publicKey,
      taskSubmitterKeypair.publicKey,
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
      taskSubmitterKeypair,
      mint,
      taskSubmitterKeypair.publicKey
    );

    console.log(
      new Date(),
      "bootstraper token account is",
      tokenAccount.address.toBase58()
    );

    // mint tokens to send to the bouty account
    console.log(new Date(), "minting some tokens");
    await mintTo(
      connection,
      taskSubmitterKeypair,
      mint,
      tokenAccount.address,
      taskSubmitterKeypair.publicKey,
      10_000_000
    );
  });

  it("Is Task account initialized and bountied", async () => {
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
      fromPubkey: taskSubmitterKeypair.publicKey,
      newAccountPubkey: bountyAccount.publicKey,
    });

    // init token account IX
    const initTempAccountIx = createInitializeAccountInstruction(
      bountyAccount.publicKey,
      mintKeypair.publicKey,
      taskSubmitterKeypair.publicKey,
      TOKEN_PROGRAM_ID
    );

    const tokenAccountInitTx = new web3.Transaction();
    tokenAccountInitTx.add(createBountyAccountIx);
    tokenAccountInitTx.add(initTempAccountIx);

    tokenAccountInitTx.feePayer = taskSubmitterKeypair.publicKey;

    // initializing new bounty token account with tx
    console.log(new Date(), "Initializing new bounty account");
    const txSig = await connection.sendTransaction(tokenAccountInitTx, [
      bountyAccount,
      taskSubmitterKeypair,
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
        taskSubmitterKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    let bootstraperTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      taskSubmitterKeypair.publicKey
    );
    console.log(
      new Date(),
      "bootstraper token account is",
      bootstraperTokenAccount.toBase58()
    );

    let [beforeBountyAccountOnSol, beforeBaAmount] =
      await fetchDecodeTokenAccount(
        bountyAccount.publicKey,
        localAnchorProvider
      );

    console.log(
      new Date(),
      "## Assert: bounty account is owned by Bootstraper"
    );
    assert.equal(
      beforeBountyAccountOnSol.owner.toBase58(),
      taskSubmitterKeypair.publicKey.toBase58()
    );

    console.log(new Date(), "Invoking initialize");
    const tx = await program.methods
      .initialize(
        new anchor.BN(6000),
        "the_path_totask_program",
        "the_path_to_audit_program"
      )
      .accounts({
        bountyAccount: bountyAccount.publicKey,
        taskAccount: pda,
        bootstraper: taskSubmitterKeypair.publicKey,
        bootstraperTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([taskSubmitterKeypair])
      .rpc();
    console.log(new Date(), "Your transaction", tx);

    let [bountyAccountOnSol, baAmount] = await fetchDecodeTokenAccount(
      bountyAccount.publicKey,
      localAnchorProvider
    );

    console.log(new Date(), "## Assert: bounty account is owned by Program");
    assert.equal(bountyAccountOnSol.owner.toBase58(), pda.toBase58());

    console.log(
      new Date(),
      "## Assert: bounty amount has been successfully transferred to Program Owned Account"
    );
    assert.equal("6000", baAmount);

    let [bootstraperTokenAccountOnSol, btAmount] =
      await fetchDecodeTokenAccount(
        bootstraperTokenAccount,
        localAnchorProvider
      );

    console.log(new Date(), "## Assert: Bootraper's token account is deducted");
    assert.equal("9994000", btAmount);

    console.log(new Date(), "## Assert: Bootraper's token account is deducted");
    let taskAccountOnSol = await program.account.task.fetch(pda);

    console.log(new Date(), "## Assert: PDA is initialized correctly");
    console.log(new Date(), "## Assert: PDA has auditProgramLocation");
    assert.equal(
      taskAccountOnSol.auditProgramLocation,
      "the_path_totask_program"
    );

    console.log(new Date(), "## Assert: PDA has taskProgramLocation");
    assert.equal(
      taskAccountOnSol.taskProgramLocation,
      "the_path_to_audit_program"
    );

    console.log(new Date(), "All assertions successful");
  });

  it("Has task been assigned successfully", async () => {
    let [pda, bump] = await findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("task_v0")),
        taskSubmitterKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );
    program.methods
      .assignTask()
      .accounts({ taskAccount: pda, worker: taskWorkerKeypair.publicKey })
      .signers([taskWorkerKeypair])
      .rpc();

    let taskAccountOnSol = await program.account.task.fetch(pda, "confirmed");

    console.log(taskAccountOnSol);

    console.log(new Date(), "## Assert: PDA  task has expected worker");
    assert.equal(
      taskAccountOnSol.assignee.toBase58(),
      taskWorkerKeypair.publicKey.toBase58()
    );
  });
});
