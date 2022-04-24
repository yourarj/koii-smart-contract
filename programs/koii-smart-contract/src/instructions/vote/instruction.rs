use anchor_lang::prelude::*;
use anchor_spl::token::{self};

use super::account::StakingInput;

pub fn initialize_staking(ctx: Context<StakingInput>, staked_amount: u64) {
    // let clock: Clock = Clock::get().unwrap();
    ctx.accounts.staking_info_account.bump =
        ctx.bumps.get("staking_info_account").unwrap().to_owned();
    ctx.accounts.staking_info_account.stake_account = ctx.accounts.stake_account.key();
    ctx.accounts.staking_info_account.staked_amount = staked_amount;
    // ctx.accounts.staking_info_account.staked_at = clock.unix_timestamp;

    // transfer staked token from user token account to program owned account
    let transfer = token::Transfer {
        from: ctx.accounts.staker_token_account.to_account_info(),
        to: ctx.accounts.stake_account.to_account_info(),
        authority: ctx.accounts.staker.to_account_info(),
    };

    let token_transfer_ctx =
        CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer);

    match token::transfer(token_transfer_ctx, staked_amount) {
        Ok(_) => (),
        Err(_) => msg!("Token transfer failed"),
    }

    let token_account_set_auth_ctx = token::SetAuthority {
        current_authority: ctx.accounts.staker.to_account_info(),
        account_or_mint: ctx.accounts.stake_account.to_account_info(),
    };

    let set_auth_result = token::set_authority(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_account_set_auth_ctx,
        ),
        token::spl_token::instruction::AuthorityType::AccountOwner,
        Some(ctx.accounts.staking_info_account.key()),
    );

    match set_auth_result {
        Ok(_) => (),
        Err(_) => msg!("Token set authority failed"),
    }
    msg!("Staking Info Account initialized successfully");
}
