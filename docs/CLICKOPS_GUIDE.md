# CLICKOPS_GUIDE.md — Visual UI Validation & ClickOps Testing Walkthrough

> **Platform:** Taskforce (`Taskforce.ai`)  
> **Status:** Canonical Manual Verification Protocol  
> **Target Audience:** Product Testers, QA Engineers, Platform Owners  

---

## 1. Overview & Setup Check

This ClickOps guide provides step-by-step instructions to manually test and validate all features in the live UI using your browser.

### Start the Servers (if not already running)
1. **Backend Server:**
   ```bash
   cd backend
   uv run server
   ```
   *Runs on `http://localhost:8000`.*
2. **Frontend Dev Server:**
   ```bash
   cd frontend
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
   *Open `http://localhost:5173` in your browser.*

---

## 2. ClickOps Test Suite

### Step 1: Validate Authentication & Password Eye Toggle
1. Navigate to `http://localhost:5173/signin`.
2. Observe the clean Binance dark aesthetic.
3. In the **Password** field, type any test password (e.g. `SecretPass123`).
4. **Action:** Click the eye icon (`Eye`) on the right side of the password field.
   - **Expected Result:** The password text becomes visible in plain text.
5. Click the eye icon again (`EyeOff`).
   - **Expected Result:** The password becomes masked dots again.
6. Click **Use Demo Account** or sign in with username `deepanshu_verma` and password `password123`.
7. **Expected Result:** You are signed in immediately and redirected to the Problem Floor.

---

### Step 2: Validate the Problem Floor & Live Telemetry
1. Look at the top navigation bar:
   - Notice the logo `Taskforce.ai` with the golden `.ai` badge.
   - Look at the user badge on the top right showing `Deepanshu Verma (@deepanshu_verma)`.
   - Look at the gold `VIP Unlimited` badge. Hover your mouse over it.
   - **Expected Result:** Tooltip displays *"Owner VIP Pass: Unlimited daily problem solves and game turns."*
2. Look at the left sidebar list of problems:
   - Notice the compact golden database icon (`<Database />`) on problems with attached documents.
   - Hover over the database icon to see the document filename tooltip.
3. Look at the bottom telemetry ribbon:
   - Notice live metrics: **Active Agents**, **Tokens Consumed**, **Execution Latency**, and **LangSmith Status**.

---

### Step 3: Validate Unicode Math & Optimization Viewer
1. In the left problem list, search or click on:
   - **"Constrained Nonlinear Optimization via Karush-Kuhn-Tucker (KKT) Conditions"** (Problem #25).
2. Click on the **Verified Solution** tab.
3. Observe the rendering:
   - **Expected Result:** Instead of unreadable LaTeX syntax (`\[ \nabla f \le 0 \]`), you see clean Unicode math symbols ($∇f(x)$, $∑$, $≤$, $≥$, $λ_i$, $μ_j$, $x_k$).
   - A dedicated **Math & Formulation Card** is displayed with a formula copy action.
   - Below it, a **VS Code Style Code Block** displays the production Python SciPy script with traffic lights (`red`, `yellow`, `green`), line numbers, and a 1-click **Copy Code** button.

---

### Step 4: Validate Binance-Themed Problem Deletion Modal
1. Select any test problem in the floor (or click **+ New Problem** to create a temporary one).
2. Click the red trash can icon / **Delete Problem** button.
3. **Expected Result:**
   - No native browser popup appears!
   - A custom dark Binance-themed dialog appears titled *"Delete Problem"*.
   - It shows a warning banner and previews the problem title.
4. Click **Cancel** to dismiss, or click **Delete Problem** to confirm removal.

---

### Step 5: Validate the Autonomous Tic-Tac-Toe Arena (`/game`)
1. In the top navigation bar, click on **Tic-Tac-Toe Arena** (or navigate to `http://localhost:5173/game`).
2. Observe the agent selection carousel featuring all 6 agents (Marcus Vance, Elena Rostova, David Park, Maya Patel, James Thorne, Sarah Chen) with tactical radar ratings.
3. Select **Marcus Vance** as your opponent.
4. Select the difficulty mode: **"Tactical / Try to Win"**.
5. Click on any square on the 3x3 grid to make your move (as 'X'):
   - **Expected Result:**
     - A pleasant audio chime plays synthesized by the Web Audio API.
     - The AI opponent moves immediately.
     - Marcus Vance's dialogue balloon updates with real-time tactical commentary.
6. Play strategically to trap the AI and achieve 3-in-a-row:
   - **Expected Result:**
     - The winning tiles glow with a golden highlight line.
     - An explosion of celebratory confetti bursts across the screen!
     - The Scoreboard increments your **Player Wins** counter.

---

### Step 6: Validate the VIP Unlimited Pass & Owner Admin Console
1. While logged in as `deepanshu_verma`, click the **VIP Unlimited** badge or **VIP Console** button in the top header.
2. In the modal, observe the exclusive **Platform Owner Controls**:
   - The current dynamic VIP access code is shown (`SWARM_SUPER_2026`).
   - Click **Copy Code** to copy it to clipboard.
3. **Test Updating the VIP Code:**
   - In the "Update VIP Code" input, enter a new code (e.g. `TEST_VIP_999`) and click **Update VIP Code**.
   - **Expected Result:** A success confirmation appears and the active code updates instantly.
4. **Test the Revocation Modal:**
   - In the **Active VIP Pass Holders** table, locate any registered user.
   - Click the red **Revoke** button next to their name.
   - **Expected Result:**
     - A Binance-themed confirmation modal appears titled *"Revoke VIP Access"*.
     - It displays the target user's initial and username and explains that they will revert to the 5/day quota.
   - Click **Cancel** to dismiss safely without revoking, or click **Revoke VIP Access** to test immediate revocation.

---

### Step 7: Validate Standard User Quotas (Logout Test)
1. In the top header, click **Logout**.
2. Sign in as a regular user (e.g., `user_a6f4c149` with password `password123` or register a new account).
3. Observe the top header:
   - Instead of the golden "VIP Unlimited" badge, it shows a **Daily Quota: 5/5** pill.
4. Click **Redeem VIP Pass**:
   - Enter the active VIP access code (`SWARM_SUPER_2026` or the one you updated).
   - Click **Redeem Access Code**.
   - **Expected Result:** Instant upgrade! The quota pill switches to the golden **VIP Unlimited** pass.
