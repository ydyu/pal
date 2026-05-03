# Lessons Learned: Research & Verification Guidelines

Follow these principles when investigating binary data structures or verifying asset resolution logic.

### 1. Data-First, Documentation-Second
*   Treat documentation as a hypothesis, not a fact. Binary data is the only source of truth.
*   If a documented struct size (e.g., 66 bytes) does not perfectly divide the total subfile length (e.g., 11200 bytes), the documentation is incorrect.

### 2. The "Golden Sample" Anchor
*   Identify a known game-logic relationship (e.g., "Enemy X drops Item Y").
*   Find the internal ID of Item Y and search for it within the raw bytes of Enemy X's record.
*   This immediately defines the **offset** and **data type** (e.g., Word Index vs. Master ID) without guesswork.

### 3. Verify Indexing Early
*   Never assume 0-based or 1-based indexing for stats tables.
*   Test a known low-ID record (like Slime ID 1) at both Offset 0 and Offset [Size] and compare values (like HP) against expected game data.

### 4. Distinguish ID Types
*   **Word Index:** A direct pointer to a string in `WORD.DAT`.
*   **Master ID (V1):** An internal value used to link names to other tables (stats, sprites).
*   Always determine which ID type a specific field (like "Steal Item") uses before attempting to resolve it.

### 5. Empirical Verification is the Unit Test
*   Use export tools or runtime inspectors to verify that code changes match the actual game behavior.
*   If the UI shows the correct image but the research says the offset is wrong, the research is likely describing a different version of the data.

### 6. Look for Patterns
*   Dump multiple records in a columnar format (Hex and Decimal side-by-side).
*   Search for constants (like a repeated resistance value) or predictable sequences (like incrementing levels) to confirm column alignment.
