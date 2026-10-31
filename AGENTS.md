# Project Guidelines & Rules

## Git & Version Control Protocol

- **Remote Repository:** `https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git`
- **Target Branch:** `main`

### Controlled Commit & Push Policy
1. **No Automatic Remote Push:**
   - Do NOT automatically push changes to the remote `main` branch.
   - Remote pushes require a completed pre-push review and **explicit user approval**.
2. **Pre-Push Review Checklist:**
   - **Git Diff Review:** Inspect `git diff` to ensure only intended files and modifications are staged.
   - **Secret & Credential Scanning:** Verify that no API keys, personal tokens, credentials, `.env` files, or sensitive local configuration files are tracked or staged.
   - **Test Verification:** Verify that all relevant test cases and lint checks pass cleanly.
   - **User Approval Gate:** Request explicit user authorization before executing `git push origin main`.
3. **Commit Standards:**
   - Keep commits clear, descriptive, and atomic using Conventional Commits (`docs:`, `feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
