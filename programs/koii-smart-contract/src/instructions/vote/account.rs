use crate::constant::STAKING_INFO_ACCOUNT_SPACE;
use crate::state::stake_info::StakeInfo;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct StakingInput<'info> {
    /// stake account
    #[account(mut)]
    pub stake_account: Account<'info, TokenAccount>,

    /// stake info account
    #[account(
        init,
        space=STAKING_INFO_ACCOUNT_SPACE,
        seeds=[b"staking_info_v0".as_ref(), staker.key().as_ref()],
        bump,
        payer=staker
    )]
    pub staking_info_account: Account<'info, StakeInfo>,

    /// staker
    #[account(mut)]
    pub staker: Signer<'info>,

    // staker token account
    #[account(mut)]
    pub staker_token_account: Account<'info, TokenAccount>,

    /// token program
    pub token_program: Program<'info, Token>,

    /// sytem program
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}
