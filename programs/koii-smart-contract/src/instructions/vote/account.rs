use crate::state::stake_info::StakeInfo;
use crate::state::task::Task;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct VoteInput<'info> {
    /// stake info account
    #[account(mut)]
    pub task_account: Account<'info, Task>,

    /// stake info account
    pub staking_info_account: Account<'info, StakeInfo>,

    /// staker
    #[account(mut)]
    pub voter: Signer<'info>,
}
