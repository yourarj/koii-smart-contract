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
    #[msg("Invalid claimer, You can't claim the bounty as you are not task executor/worker")]
    InvalidBountyClaimer,
    #[msg("Bounty can't be claimed unless sufficient votes are casted")]
    InsufficientVotesForClaim,
    #[msg("Bounty account mistmatch, bounty account for task and provided account don't match")]
    InvalidBountyAccountForClaim,
}
