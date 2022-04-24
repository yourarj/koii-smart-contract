import * as anchor from "@project-serum/anchor";
import { Program, web3 } from "@project-serum/anchor";
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

describe("Staking Tests: koii-smart-contract", () => {
  const localAnchorProvider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(localAnchorProvider);

  const program = anchor.workspace
    .KoiiSmartContract as Program<KoiiSmartContract>;
  const userKeypair = web3.Keypair.generate();
  const mintKeypair = web3.Keypair.generate();
  console.log("staking: My address ", userKeypair.publicKey.toBase58());
  console.log("staking: Mint address ", mintKeypair.publicKey.toBase58());

  const connection = anchor.getProvider().connection;
  // const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const amountToStake = 85340;
  const amountToMint = 10_000_000;
  const amountAfterDeduction = amountToMint - amountToStake;

  // perform prerequisites for the tests
  before(async () => {
    console.log(new Date(), "staking: requesting SOL airdrop");
    const airdropTx = await connection.requestAirdrop(
      userKeypair.publicKey,
      5 * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropTx);

    console.log(new Date(), "staking: fetching SOL balance after airdrop");
    const balance = await connection.getBalance(userKeypair.publicKey);
    console.log(
      new Date(),
      "staking: Balance of",
      userKeypair.publicKey.toBase58(),
      "and balance is",
      balance
    );

    // TODO: (future scope) mint creation with anchor spl bundled package

    // create new token (mint)

    console.log(new Date(), "staking: creating new token mint account");
    const mint = await createMint(
      connection,
      userKeypair,
      userKeypair.publicKey,
      userKeypair.publicKey,
      18,
      mintKeypair
    );

    // create associated token account
    console.log(
      new Date(),
      "staking: creating new token associated token account of mint",
      mint.toBase58()
    );
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      userKeypair,
      mint,
      userKeypair.publicKey
    );

    console.log(
      new Date(),
      "staking: staker token account is",
      tokenAccount.address.toBase58()
    );

    // mint tokens to send to the bouty account
    console.log(new Date(), "staking: minting tokens");
    await mintTo(
      connection,
      userKeypair,
      mint,
      tokenAccount.address,
      userKeypair.publicKey,
      amountToMint
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
      fromPubkey: userKeypair.publicKey,
      newAccountPubkey: stakeAccount.publicKey,
    });

    // init stake account IX
    const initStakeAccountIx = createInitializeAccountInstruction(
      stakeAccount.publicKey,
      mintKeypair.publicKey,
      userKeypair.publicKey,
      TOKEN_PROGRAM_ID
    );

    const stakeAccountInitTx = new web3.Transaction();
    stakeAccountInitTx.add(createStakeAccountIx);
    stakeAccountInitTx.add(initStakeAccountIx);

    stakeAccountInitTx.feePayer = userKeypair.publicKey;

    // initializing new stake account with tx
    console.log(new Date(), "staking: Initializing new stake token account");
    const txSig = await connection.sendTransaction(stakeAccountInitTx, [
      stakeAccount,
      userKeypair,
    ]);
    await connection.confirmTransaction(txSig);

    console.log(new Date(), "finding PDA for:", program.programId.toBase58());
    let [pda, bump] = await findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("staking_info_v0")),
        userKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    let stakerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      userKeypair.publicKey
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
      userKeypair.publicKey.toBase58()
    );

    console.log(new Date(), "staking: Invoking initialize");
    const tx = await program.methods
      .initializeStakingAccount(new anchor.BN(amountToStake))
      .accounts({
        stakeAccount: stakeAccount.publicKey,
        stakingInfoAccount: pda,
        staker: userKeypair.publicKey,
        stakerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([userKeypair])
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
});
