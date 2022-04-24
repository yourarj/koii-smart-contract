use crate::state::task::Task;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{Token, TokenAccount};
use std::string::String;

#[derive(Accounts)]
pub struct BootStrapInput<'info> {
    /// bounty account
    bounty_account: Account<'info, TokenAccount>,

    /// task account
    #[account(
        init,
        space=400,
        seeds=[b"task_v0".as_ref(), bootstraper.key().as_ref()],
        bump,
        payer=bootstraper
    )]
    task_account: Account<'info, Task>,

    /// bootstraper
    #[account(mut)]
    bootstraper: Signer<'info>,

    /// token program
    token_program: Program<'info, Token>,

    /// sytem program
    #[account(address = system_program::ID)]
    system_program: Program<'info, System>,
}
