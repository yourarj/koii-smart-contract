use crate::{constant::VOTES_REQUIRED_FOR_BOUNTY_PAYOUT, error::ErrorCode};
use anchor_lang::prelude::*;
use anchor_spl::token;

use super::account::BountyClaimInput;

pub fn claim_bounty(ctx: Context<BountyClaimInput>) -> Result<()> {
    // check if the claimer is the one who has actually done the work
    require!(
        ctx.accounts
            .claimer
            .key()
            .eq(&ctx.accounts.task_account.assignee),
        ErrorCode::InvalidBountyClaimer
    );

    // check if the sufficient votes are casted required for payout
    require!(
        ctx.accounts.task_account.votes >= VOTES_REQUIRED_FOR_BOUNTY_PAYOUT,
        ErrorCode::InsufficientVotesForClaim
    );

    // check if the bounty account provided is the right one
    require!(
        ctx.accounts
            .bounty_account
            .key()
            .eq(&ctx.accounts.task_account.bounty),
        ErrorCode::InvalidBountyAccountForClaim
    );

    let bounty_amout = ctx.accounts.bounty_account.amount;

    // transfer staked token from user token account to program owned account
    let transfer = token::Transfer {
        from: ctx.accounts.bounty_account.to_account_info(),
        to: ctx.accounts.claimer_token_account.to_account_info(),
        authority: ctx.accounts.task_account.to_account_info(),
    };

    let seeds = &[
        b"task_v0",
        ctx.accounts.task_account.creator.as_ref(),
        &[ctx.accounts.task_account.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let token_transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer,
        signer_seeds,
    );

    match token::transfer(token_transfer_ctx, bounty_amout) {
        Ok(_) => (),
        Err(_) => msg!("Token transfer failed"),
    }

    Ok(())
}
