use crate::constant::TASK_ACCOUNT_SPACE;
use crate::state::task::Task;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{Token, TokenAccount};
use std::string::String;

#[derive(Accounts)]
pub struct BootStrapInput<'info> {
    /// bounty account
    #[account(mut)]
    pub bounty_account: Account<'info, TokenAccount>,

    /// task account
    #[account(
        init,
        space=TASK_ACCOUNT_SPACE,
        seeds=[b"task_v0".as_ref(), bootstraper.key().as_ref()],
        bump,
        payer=bootstraper
    )]
    pub task_account: Account<'info, Task>,

    /// bootstraper
    #[account(mut)]
    pub bootstraper: Signer<'info>,

    // bootstraper token account
    #[account(mut)]
    pub bootstraper_token_account: Account<'info, TokenAccount>,

    /// token program
    pub token_program: Program<'info, Token>,

    /// sytem program
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}
