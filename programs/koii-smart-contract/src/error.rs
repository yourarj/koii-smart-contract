//! ### Errors
//!
//! all possible errors which could occur during the
//! solana program execution
//!
use anchor_lang::prelude::*;

/// ErroCode enum\
///
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid staking account provided for vote")]
    InvalidStakeAccountForVote,
    #[msg("To participate in voting you have to stake the tokens first")]
    InvalidStakedAmountForVote,
}
