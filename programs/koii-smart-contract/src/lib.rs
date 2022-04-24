mod constant;
mod instructions;
mod state;

use anchor_lang::prelude::*;

declare_id!("WwmeGvrs7VKQKppDQo23yfEo3175jgSNcSABQeFV2Zi");

use instructions::bootstrap::account::*;

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
        instructions::bootstrap::instruction::perform_prerequisites(
            ctx,
            bounty_amount,
            task_program_location,
            audit_program_location,
        );
        Ok(())
    }
}
