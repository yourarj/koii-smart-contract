mod constant;
mod instructions;
mod state;

use anchor_lang::prelude::*;

declare_id!("WwmeGvrs7VKQKppDQo23yfEo3175jgSNcSABQeFV2Zi");

use instructions::bootstrap::account::*;

#[program]
pub mod koii_smart_contract {
    use super::*;
    pub fn initialize(ctx: Context<BootStrapInput>) -> Result<()> {
        Ok(())
    }
}
