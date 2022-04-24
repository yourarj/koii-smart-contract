use anchor_lang::prelude::*;

use super::account::AssignTaskInputs;

pub fn assign_task(ctx: Context<AssignTaskInputs>) {
    ctx.accounts.task_account.assignee = ctx.accounts.worker.key();
    msg!(
        "task assignee has been changed to {}",
        ctx.accounts.worker.key()
    );
}
