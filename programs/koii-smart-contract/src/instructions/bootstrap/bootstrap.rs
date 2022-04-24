use anchor_lang::prelude::*;
use anchor_spl::token::{spl_token::instruction::TokenInstruction, Token};
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
    msg!("Task account initialized successfully");

    TokenInstruction::Transfer {
        amount: bounty_amount,
    };
}
