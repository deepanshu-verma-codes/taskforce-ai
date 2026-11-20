# ADMIN.md — Platform Administration & Owner Operations Guide

> **Platform:** Taskforce (`Taskforce.ai`)  
> **Target Audience:** System Administrators, Platform Owners (`deepanshu_verma`)  
> **Status:** Canonical & Operational  

---

## 1. Owner & Administrator Roles

The platform recognizes designated owner accounts specified in `QUOTA_EXEMPT_USERNAMES`:
- **Primary Owner Accounts:** `deepanshu_verma`, `deepanshu-verma`
- **Owner Privileges:**
  1. **Permanent Quota Exemption:** Unlimited problem resolutions (999,999) and unlimited game moves.
  2. **VIP Code Authority:** Update the active VIP access code dynamically via the UI or API.
  3. **User Access Revocation:** View all active VIP users and revoke their access with one click.
  4. **Irrevocable Status:** Owner accounts cannot have their VIP status revoked or stripped.

---

## 2. Managing VIP Codes & User Access

### Active VIP Access Code
- **Current Dynamic Code:** `SWARM_SUPER_2026` (stored in SQLite `system_settings` table under key `vip_access_code`).
- **Initial Fallback Code:** `VIP2026` (configured in `backend/app/config.py`).

### How to Change the VIP Code via UI (Owner View)
1. Sign in as `deepanshu_verma`.
2. Click the gold **VIP Unlimited** badge or **VIP Console** button in the top header.
3. In the modal, locate the **VIP Code Management** section.
4. Enter a new code (e.g., `ENTERPRISE_2027`) and click **Update VIP Code**.
5. All future redemptions will immediately require the new code. Existing VIP users remain active until revoked.

### How to Revoke VIP Status from a User
1. Open the VIP Modal while logged in as owner.
2. Scroll to the **Active VIP Pass Holders** table.
3. Click the red **Revoke** button next to any user.
4. Review the Binance-themed confirmation modal stating the target user's details.
5. Click **Revoke VIP Access**. The user will immediately revert to the standard 5/day limit.

### API Endpoints for VIP Management
| Endpoint | Method | Required Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/vip/status` | `GET` | Authenticated | Check current user's VIP status and remaining quota |
| `/api/vip/redeem` | `POST` | Authenticated | Submit code to unlock VIP status |
| `/api/vip/code` | `POST` | Owner only | Change the platform-wide VIP code |
| `/api/vip/users` | `GET` | Owner only | List all users with active VIP status |
| `/api/vip/revoke` | `POST` | Owner only | Revoke VIP status from a specific user ID |

---

## 3. Database Administration & Seeding

### Seeding Multi-Domain Problems
To re-seed the platform with the 25 alternating multi-disciplinary problems (IT $\to$ Healthcare $\to$ Automotive $\to$ Finance $\to$ Math):
```bash
cd backend
uv run python seed.py
```
*Note: This preserves user accounts while resetting problem floors to clean `PENDING` states.*

### Inspecting Database State via CLI
```bash
cd backend
# Check total problems and users
uv run python -c "
import sqlite3
conn = sqlite3.connect('fde_swarm.db')
c = conn.cursor()
c.execute('SELECT COUNT(*) FROM problems')
print('Problems:', c.fetchone()[0])
c.execute('SELECT COUNT(*) FROM users')
print('Users:', c.fetchone()[0])
"
```

---

## 4. Rate Limit & Quota Configuration

All limits are centrally configured in `backend/app/config.py` and can be overridden via `.env`:

| Setting | Default Value | Description |
| :--- | :--- | :--- |
| `DAILY_GAME_LIMIT` | `5` | Maximum Tic-Tac-Toe games per standard user per day |
| `DAILY_PROBLEM_LIMIT` | `5` | Maximum problem resolutions per standard user per day |
| `RATE_LIMIT_DEFAULT` | `120` | General API requests per 60 seconds per IP |
| `RATE_LIMIT_SOLVE` | `10` | Swarm solve invocations per 60 seconds per IP |
| `RATE_LIMIT_AUTH` | `20` | Sign-in / registration attempts per 60 seconds per IP |
| `RATE_LIMIT_DELETE` | `15` | Problem deletions per 60 seconds per IP |
| `QUOTA_EXEMPT_USERNAMES` | `"deepanshu_verma,deepanshu-verma"` | Comma-separated list of permanent VIP users |
