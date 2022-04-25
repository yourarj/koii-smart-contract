use anchor_lang::prelude::*;
use anchor_spl::token::{self};
use std::string::String;

use super::account::BootStrapInput;

pub fn initialize_task(
    ctx: Context<BootStrapInput>,
    bounty_amount: u64,
    task_program_location: String,
    audit_program_location: String,
) {
    ctx.accounts.task_account.bump = ctx.bumps.get("task_account").unwrap().to_owned();
    ctx.accounts.task_account.bounty = ctx.accounts.bounty_account.key();
    ctx.accounts.task_account.audit_program_location = task_program_location;
    ctx.accounts.task_account.task_program_location = audit_program_location;
    ctx.accounts.task_account.votes = 0;
    ctx.accounts.task_account.creator = ctx.accounts.bootstraper.key();

    let transfer = token::Transfer {
        from: ctx.accounts.bootstraper_token_account.to_account_info(),
        to: ctx.accounts.bounty_account.to_account_info(),
        authority: ctx.accounts.bootstraper.to_account_info(),
    };

    let token_transfer_ctx =
        CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer);

    match token::transfer(token_transfer_ctx, bounty_amount) {
        Ok(_) => (),
        Err(_) => msg!("Token transfer failed"),
    }

    let token_account_set_auth_ctx = token::SetAuthority {
        current_authority: ctx.accounts.bootstraper.to_account_info(),
        account_or_mint: ctx.accounts.bounty_account.to_account_info(),
    };

    let set_auth_result = token::set_authority(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_account_set_auth_ctx,
        ),
        token::spl_token::instruction::AuthorityType::AccountOwner,
        Some(ctx.accounts.task_account.key()),
    );

    match set_auth_result {
        Ok(_) => (),
        Err(_) => msg!("Token set authority failed"),
    }
    msg!("Task account initialized successfully");
}
