use anchor_lang::prelude::*;
use std::string::String;

#[account]
pub struct Task {
    pub bounty: Pubkey,
    pub audit_program_location: String,
    pub task_program_location: String,
    pub votes: u8,
    pub bump: u8,
}
