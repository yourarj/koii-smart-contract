mod constant;
mod error;
mod instructions;
mod state;

use anchor_lang::prelude::*;

declare_id!("WwmeGvrs7VKQKppDQo23yfEo3175jgSNcSABQeFV2Zi");

use instructions::assign_task::account::*;
use instructions::bootstrap::account::*;
use instructions::staking::account::*;
use instructions::vote::account::*;

#[program]
pub mod koii_smart_contract {
    use super::*;
    use std::string::String;
    pub fn initialize(
        ctx: Context<BootStrapInput>,
        bounty_amount: u64,
        task_program_location: String,
        audit_program_location: String,
    ) -> Result<()> {
        instructions::bootstrap::instruction::initialize_task(
            ctx,
            bounty_amount,
            task_program_location,
            audit_program_location,
        );
        Ok(())
    }

    /// initialize staking
    pub fn initialize_staking_account(
        ctx: Context<StakingInput>,
        staked_amount: u64,
    ) -> Result<()> {
        instructions::staking::instruction::initialize_staking(ctx, staked_amount);
        Ok(())
    }

    /// assign task to signer
    pub fn assign_task(ctx: Context<AssignTaskInputs>) -> Result<()> {
        instructions::assign_task::instruction::assign_task(ctx);
        Ok(())
    }

    /// vote for task
    pub fn vote(ctx: Context<VoteInput>) -> Result<()> {
        instructions::vote::instruction::vote(ctx)
    }
}
