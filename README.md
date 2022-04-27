# koii-smart-contract (solana/k2)

## submit/execute/stake/vote/bounty/claim

a solana smart contract, written in anchor framework. This is part of real use case and implementation of bounty hunting in return of task execution.

If you are interested to learn from it. It utilizes following constructs/features from solana
 - Program owned accounts
 - Program owned token accounts
 - Cross Program Invocation (CPI)
 - SPL token creation
 - SPL token minting
 - SPL token account authority transfer,
 - SPL token transfer

## stack details
1. [anchor v0.24.2](https://github.com/project-serum/anchor)
2. [solana v1.19.3](https://github.com/solana-labs/solana)
3. [@solana/web3.js v1.39.1](https://github.com/solana-labs/solana-web3.js)
4. [@solana/spl-token v0.2.0](https://github.com/solana-labs/solana-program-library)
## Overview

![koii-smart-contract-flowchart](https://user-images.githubusercontent.com/11359226/165325654-891f427f-d3d7-494b-af5f-a47a2a166829.png)

KOII solana smart contract allows it's user to submit task it wants exectutor to excute. In return executor get bounty as reward for executing the task.

## flow
1. user submits task and bounty token amount he is willing to pay in return
   1. a new bounty token account is created
   2. it's ownership is set to program
   3. bounty tokens are transferred to newly created bounty token account
   4. task metadata including bounty publickey is stored in pda associated with task.
2. an executor interested in the bounty assigns assigns tasks to himself
   1. executor nominates itself as executor of the specific task
   2. updates metadata of task
3. When the task is completed voting on task starts
   1. In order to be able to vote on tasks 
      1. one has to stake tokens and earn voting power
      2. staking transfers tokens from stakers token account to program owned stake token account
   2. Eligible voters cast vote in favour of task, successful vote update task pda
4. When sufficient votes have been casted task executor claims the bouty
5. Program transfer bounty tokens from bounty account to executors token account