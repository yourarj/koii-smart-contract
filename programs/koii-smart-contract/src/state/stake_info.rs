use anchor_lang::prelude::*;

#[account]
pub struct StakeInfo {
    pub stake_account: Pubkey,
    /// timestamp when the staking was done
    pub staked_at: i64,
    pub staked_amount: u64,
    pub bump: u8,
}
