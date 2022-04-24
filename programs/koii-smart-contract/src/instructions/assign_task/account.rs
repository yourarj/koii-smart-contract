use crate::state::task::Task;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AssignTaskInputs<'info> {
    /// stake info account
    #[account(mut)]
    pub task_account: Account<'info, Task>,

    /// worker
    #[account(mut)]
    pub worker: Signer<'info>,
}
