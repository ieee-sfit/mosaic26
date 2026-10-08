# 🎨 Mosaic

Welcome to the **Mosaic** project! This repository is designed for multi-developer collaboration where team members work on isolated workstations to build modular features in React + Vite.

---

## 📋 Collaboration Rules & Guidelines

To maintain a clean repository and avoid merge conflicts, all collaborators **must** strictly adhere to the following rules:

> [!CAUTION]
> ### 🚫 DO NOT COMMIT OR PUSH DIRECTLY TO `main`
> Direct commits or pushes to the `main` branch are strictly prohibited. All changes must go through a **Fork -> Feature Branch -> Pull Request** review workflow.

---

### 📌 Core Guidelines

1. **Pick One Workstation Only**:
   - Work only inside your chosen/assigned workstation folder under [`src/`](file:///c:/Users/Dnyani/Downloads/dev/mosaic/src):
     - `src/workstation1/`
     - `src/workstation2/`
     - `src/workstation3/`
     - `src/workstation4/`
   - Do not edit files belonging to other workstations.

2. **Always Pull Latest `main` First**:
   - Before starting any new work or pulling code, **always pull the latest changes from upstream `main`** so you are building on top of the most up-to-date codebase.

3. **Always Verify You Are on Your Feature Branch (NOT `main`)**:
   - Before writing code or making commits, always check your active branch using `git branch` or `git status`. Ensure you are on your dedicated branch and **never on `main`**.

4. **Fork Before Working**
   - Fork this repository to your personal GitHub account before starting development.

---

## 🚀 Step-by-Step Contribution Workflow

Follow these steps carefully to contribute:

### 1️⃣ Fork the Repository
Click the **Fork** button at the top right corner of this GitHub repository to create a copy under your account.

### 2️⃣ Clone Your Fork
Clone your newly forked repository to your local machine:
```bash
git clone https://github.com/<your-username>/mosaic.git
cd mosaic
```

### 3️⃣ Configure Upstream & Pull Latest `main`
Set up the upstream remote and pull the latest changes from the original `main` branch:
```bash
# Add upstream remote
git remote add upstream https://github.com/<original-owner>/mosaic.git

# Ensure local main is synced with upstream main
git checkout main
git pull upstream main
```

### 4️⃣ Create & Switch to Your Feature Branch
**Never start working directly on `main`**. Create a new branch off the updated `main`:
```bash
# Branch naming convention: feature/workstation<number>-<task-name>
git checkout -b feature/workstation1-my-feature
```

> [!IMPORTANT]
> ### 🔍 Branch Checkpoint
> Always run `git branch` to confirm your active branch:
> ```bash
> git branch
> ```
> Output should show `*` next to your feature branch (e.g., `* feature/workstation1-my-feature`), **NOT `main`**.

### 5️⃣ Install Dependencies & Run Development Server
```bash
# Install packages
npm install

# Start local dev server
npm run dev
```

### 6️⃣ Work in Your Assigned Workstation
- Place all your components, styles, and logic inside your dedicated workstation folder:
  - `src/workstation1/`
  - `src/workstation2/`
  - `src/workstation3/`
  - `src/workstation4/`
- Avoid touching shared configuration files unless coordinated with the team lead.

### 7️⃣ Double Check Branch & Commit Changes
Before committing, verify again that you are on your feature branch:
```bash
# Check current status and branch
git status

# Stage your workstation changes
git add src/workstation1/

# Commit with a descriptive message
git commit -m "feat(workstation1): implement component X"

# Push to your fork
git push origin feature/workstation1-my-feature
```

### 8️⃣ Submit a Pull Request (PR)
1. Navigate to the original repository on GitHub.
2. You will see a banner prompting you to open a **Pull Request** from your branch.
3. Set the target to `base: main` $\leftarrow$ `compare: feature/workstation1-my-feature`.
4. Add a clear title and description explaining the changes made in your workstation.
5. Request review and wait for approval before merging.

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with HMR |
| `npm run build` | Builds the project for production |
| `npm run lint` | Runs ESLint to check for code quality and syntax errors |
| `npm run preview` | Locally previews the production build |

---

## 💡 Quick Tips & Best Practices

> [!WARNING]
> ### ⚠️ Accidental Work on `main`?
> If you realize you made changes while on `main` without committing yet, switch to a new branch safely:
> ```bash
> git checkout -b feature/workstation1-my-feature
> ```

> [!TIP]
> ### 🔄 Keep Your Branch Up-to-Date
> Before creating a PR or pushing changes, always sync your branch with upstream `main` to prevent conflicts:
> ```bash
> git checkout main
> git pull upstream main
> git checkout feature/workstation1-my-feature
> git rebase main
> ```

> [!IMPORTANT]
> Always run `npm run lint` before committing to ensure there are no linting errors.
