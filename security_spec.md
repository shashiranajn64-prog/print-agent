# Security Specification: Shashi Print Agent

## 1. Data Invariants
1. A Print Job must belong to a valid registered Shop (`shopId` is required, alphanumeric, <= 128 chars).
2. The print job amount must be a positive integer or float, matching positive page/copy pricing.
3. Order numbers must follow the pattern `^[A-Z0-9\\-]+$` with maximum length of 32 characters.
4. Total copies must be between 1 and 500. Total pages must be between 1 and 500.
5. Print job status transitions can only be: `pending` -> `processing` -> `printed` | `failed` | `cancelled`.
6. Once a print job is `printed` or `cancelled` (terminal states), status cannot be reverted to `pending`.
7. Shop accounts must have valid shop names (<= 100 chars), mobile numbers (10-15 digits), and valid UPI IDs (<= 100 chars).
8. Feedback entries require a rating between 1 and 5, message <= 1000 characters.

## 2. The "Dirty Dozen" Payloads (Must be rejected)
1. **Payload 1 (Ghost Field / Shadow Update)**: Update print job with `{ "isAdmin": true }` or `{ "isVerified": true }`.
2. **Payload 2 (Malformed Shop ID)**: Create a print job with 2KB string for `shopId`.
3. **Payload 3 (Negative Amount)**: Create a print job with `amount: -500`.
4. **Payload 4 (Zero Copies)**: Create a print job with `copies: 0`.
5. **Payload 5 (Unbounded Copies Attack)**: Create a print job with `copies: 99999999`.
6. **Payload 6 (Terminal State Bypass)**: Update a job whose status is already `printed` back to `pending`.
7. **Payload 7 (Immortal Field Modification)**: Update an existing print job modifying its immutable `orderNumber` or `createdAt`.
8. **Payload 8 (Arbitrary State Jump)**: Update print job status to arbitrary unknown state `"hacked"`.
9. **Payload 9 (Oversized Document Payload)**: Inject 10MB raw text into customer notes or file name.
10. **Payload 10 (Invalid Rating)**: Create feedback with `rating: 10` or `rating: -1`.
11. **Payload 11 (Shop Impersonation / ID Poisoning)**: Write shop document with path ID containing characters `../../etc`.
12. **Payload 12 (Blanket Overwrite)**: Overwrite entire shop document clearing rates or credentials.
