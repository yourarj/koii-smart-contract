use crate::error::ErrorCode;
use anchor_lang::prelude::*;

use super::account::VoteInput;

pub fn vote(ctx: Context<VoteInput>) -> Result<()> {
    let voter = &ctx.accounts.voter;

    let (expected_pda, _bump) =
        Pubkey::find_program_address(&[b"staking_info_v0", voter.key().as_ref()], ctx.program_id);

    msg!(
        "staker: {}, voter: {}",
        ctx.accounts.staking_info_account.key(),
        voter.key()
    );

    // check if the staking account belongs to voter
    require!(
        ctx.accounts.staking_info_account.key().eq(&expected_pda),
        ErrorCode::InvalidStakeAccountForVote
    );

    // check if voter has staked the amount
    require!(
        ctx.accounts.staking_info_account.staked_amount > 0,
        ErrorCode::InvalidStakedAmountForVote
    );

    // increment the vote
    ctx.accounts.task_account.votes += 1;
    msg!("Voted for task");

    Ok(())
}
