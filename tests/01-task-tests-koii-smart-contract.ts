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

  const amountToStake = 85340;
  const amountToMint = 10_000_000;
  const amountAfterDeduction = amountToMint - amountToStake;

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

    const airdropForTaskWorkerTx = await connection.requestAirdrop(
      taskWorkerKeypair.publicKey,
      5 * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropForTaskWorkerTx);

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

    const taskWokerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      taskWorkerKeypair,
      mint,
      taskWorkerKeypair.publicKey
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

    // mint some tokens to stake for task worker
    await mintTo(
      connection,
      taskSubmitterKeypair,
      mint,
      taskWokerTokenAccount.address,
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
    console.log(new Date(), "## PDA is", pda.toBase58());

    const change_assignee_tx = await program.methods
      .assignTask()
      .accounts({ taskAccount: pda, worker: taskWorkerKeypair.publicKey })
      .signers([taskWorkerKeypair])
      .rpc();

    console.log(new Date(), "Change assignee tx:", change_assignee_tx);
    let taskAccountOnSol = await program.account.task.fetch(pda);

    console.log(new Date(), "## Assert: PDA  task has expected worker");
    assert.equal(
      taskAccountOnSol.assignee.toBase58(),
      taskWorkerKeypair.publicKey.toBase58()
    );
  });

  it("Is Staking account initialized and stakes added!", async () => {
    console.log(new Date(), "staking: Is staking initialized started");
    const stakeAccount = web3.Keypair.generate();

    // create stake token account IX
    const createStakeAccountIx = web3.SystemProgram.createAccount({
      programId: TOKEN_PROGRAM_ID,
      space: AccountLayout.span,
      lamports: await connection.getMinimumBalanceForRentExemption(
        AccountLayout.span,
        "confirmed"
      ),
      fromPubkey: taskWorkerKeypair.publicKey,
      newAccountPubkey: stakeAccount.publicKey,
    });

    // init stake account IX
    const initStakeAccountIx = createInitializeAccountInstruction(
      stakeAccount.publicKey,
      mintKeypair.publicKey,
      taskWorkerKeypair.publicKey,
      TOKEN_PROGRAM_ID
    );

    const stakeAccountInitTx = new web3.Transaction();
    stakeAccountInitTx.add(createStakeAccountIx);
    stakeAccountInitTx.add(initStakeAccountIx);

    stakeAccountInitTx.feePayer = taskWorkerKeypair.publicKey;

    // initializing new stake account with tx
    console.log(new Date(), "staking: Initializing new stake token account");
    const txSig = await connection.sendTransaction(stakeAccountInitTx, [
      stakeAccount,
      taskWorkerKeypair,
    ]);
    await connection.confirmTransaction(txSig);

    console.log(new Date(), "finding PDA for:", program.programId.toBase58());
    let [pda, bump] = await findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("staking_info_v0")),
        taskWorkerKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    let stakerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      taskWorkerKeypair.publicKey
    );

    console.log(
      new Date(),
      "staking: staker token account is",
      stakerTokenAccount.toBase58()
    );

    let [beforeStakeAccountOnSol, beforeBaAmount] =
      await fetchDecodeTokenAccount(
        stakeAccount.publicKey,
        localAnchorProvider
      );

    console.log(
      new Date(),
      "## Assert: staking: stake account is owned by staker"
    );
    assert.equal(
      beforeStakeAccountOnSol.owner.toBase58(),
      taskWorkerKeypair.publicKey.toBase58()
    );

    console.log(new Date(), "staking: Invoking initialize");
    const tx = await program.methods
      .initializeStakingAccount(new anchor.BN(amountToStake))
      .accounts({
        stakeAccount: stakeAccount.publicKey,
        stakingInfoAccount: pda,
        staker: taskWorkerKeypair.publicKey,
        stakerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([taskWorkerKeypair])
      .rpc();
    console.log(new Date(), "staking: Your transaction", tx);

    let [stakeAccountOnSol, baAmount] = await fetchDecodeTokenAccount(
      stakeAccount.publicKey,
      localAnchorProvider
    );

    console.log(
      new Date(),
      "## Assert: staking: stake account is owned by Program"
    );
    assert.equal(stakeAccountOnSol.owner.toBase58(), pda.toBase58());

    console.log(
      new Date(),
      "## Assert: staking: staked amount has been successfully transferred to Program Owned Stake Account"
    );
    assert.equal(amountToStake.toString(), baAmount);

    let [_stakerTokenAccountOnSol, btAmount] = await fetchDecodeTokenAccount(
      stakerTokenAccount,
      localAnchorProvider
    );

    console.log(
      new Date(),
      "## Assert: staking: staker's token account is deducted"
    );
    assert.equal(amountAfterDeduction.toString(), btAmount);

    let stakeInfoAccountOnSol = await program.account.stakeInfo.fetch(pda);

    console.log(new Date(), "## Assert: staking: PDA is initialized correctly");
    console.log(
      new Date(),
      "## Assert: staking: PDA has correct stake account address"
    );
    assert.equal(
      stakeInfoAccountOnSol.stakeAccount.toBase58(),
      stakeAccount.publicKey.toBase58()
    );

    console.log(new Date(), "## Assert: staking PDA has right staked amount");
    assert.ok(
      stakeInfoAccountOnSol.stakedAmount.eq(new anchor.BN(amountToStake))
    );

    console.log(new Date(), "All assertions successful");
  });

  it("Can vote successfully", async () => {
    let [taskPda, taskBump] = await findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("task_v0")),
        taskSubmitterKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    let [stakingInfoPda, stakingInfoBump] = await findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("staking_info_v0")),
        taskWorkerKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    let beforeTaskAccountOnSol = await program.account.task.fetch(taskPda);

    console.log(new Date(), "## Assert: PDA  task vote has not been casted");
    assert.equal(0, beforeTaskAccountOnSol.votes);

    for (const _x of Array(5).keys()) {
      const vote_tx = await program.methods
        .vote()
        .accounts({
          stakingInfoAccount: stakingInfoPda,
          taskAccount: taskPda,
          voter: taskWorkerKeypair.publicKey,
        })
        .signers([taskWorkerKeypair])
        .rpc();

      console.log(new Date(), "vote tx:", vote_tx);
    }
    let taskAccountOnSol = await program.account.task.fetch(taskPda);

    console.log(
      new Date(),
      "can_vote: task account votes are",
      taskAccountOnSol.votes
    );
    console.log(new Date(), "## Assert: PDA  task vote has been casted");
    assert.equal(5, taskAccountOnSol.votes);
  });

  it("Can claim bounty", async () => {
    // get task pda pubkey
    let [taskPda, taskBump] = await findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("task_v0")),
        taskSubmitterKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    // get task account details
    let beforeTaskAccountOnSol = await program.account.task.fetch(taskPda);

    // get claimer pubkey
    const claimerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      taskWorkerKeypair.publicKey
    );

    // get bounty account initial balance
    let [_bb, beforeBountyAccBalance] = await fetchDecodeTokenAccount(
      beforeTaskAccountOnSol.bounty,
      localAnchorProvider
    );

    console.log(
      new Date(),
      "claim_bounty: bounty account's initial balance {}",
      beforeBountyAccBalance
    );

    // get claimer initial balance
    let [_b, beforeClaimerBalance] = await fetchDecodeTokenAccount(
      claimerTokenAccount,
      localAnchorProvider
    );

    console.log(
      new Date(),
      "claim_bounty: claimer's initial balance {}",
      beforeClaimerBalance
    );

    const vote_tx = await program.methods
      .claimBounty()
      .accounts({
        taskAccount: taskPda,
        bountyAccount: beforeTaskAccountOnSol.bounty,
        claimer: taskWorkerKeypair.publicKey,
        claimerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([taskWorkerKeypair])
      .rpc();

    let [_a, afterClaimerBalance] = await fetchDecodeTokenAccount(
      claimerTokenAccount,
      localAnchorProvider
    );

    console.log(
      new Date(),
      "## Assert: claim_bouty: bounty has been credited to claimer"
    );
    assert.equal(
      new anchor.BN(beforeClaimerBalance)
        .add(new anchor.BN(beforeBountyAccBalance))
        .toString(),
      afterClaimerBalance.toString()
    );
  });
});
