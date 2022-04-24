use anchor_lang::prelude::*;
use anchor_spl::token::{self};
use std::string::String;

use super::account::BootStrapInput;

pub fn perform_prerequisites(
    ctx: Context<BootStrapInput>,
    bounty_amount: u64,
    task_program_location: String,
    audit_program_location: String,
) {
    ctx.accounts.task_account.bump = ctx.bumps.get("task_account").unwrap().to_owned();
    ctx.accounts.task_account.bounty = ctx.accounts.bounty_account.key();
    ctx.accounts.task_account.audit_program_location = task_program_location;
    ctx.accounts.task_account.task_program_location = audit_program_location;

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
    msg!("Task account initialized successfully");
}
