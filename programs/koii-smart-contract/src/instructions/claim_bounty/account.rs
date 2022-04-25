use crate::state::task::Task;
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct BountyClaimInput<'info> {
    /// task account
    pub task_account: Account<'info, Task>,

    /// bounty account
    #[account(mut)]
    pub bounty_account: Account<'info, TokenAccount>,

    /// claimer token account
    #[account(mut)]
    pub claimer_token_account: Account<'info, TokenAccount>,

    /// staker
    #[account(mut)]
    pub claimer: Signer<'info>,

    // token program
    pub token_program: Program<'info, Token>,
}
