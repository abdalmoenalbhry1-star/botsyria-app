# Security Specification

## Data Invariants
1. User profile in `/users/{telegramId}` is only readable/writable by the user (`telegramId == request.auth.uid`).
2. `balance` field in `/users/{telegramId}` is immutable by the user (only admin can change it).
3. Access to `tasks` is read-only for authenticated users.

## The "Dirty Dozen" Payloads
1. **Invalid Update (Balance Poisoning)**: Try to update `/users/<uid>/balance` -> SHOULD FAIL.
2. **Valid Update (Username Change)**: Try to update `/users/<uid>/username` -> SHOULD SUCCEED.
3. **Unauthorized Access**: Try to read `/users/<other_uid>` -> SHOULD FAIL.

## Test Runner
A test component will be created to attempt these operations and log the results.
