import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { KoiiSmartContract } from "../target/types/koii_smart_contract";

describe("koii-smart-contract", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.KoiiSmartContract as Program<KoiiSmartContract>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
