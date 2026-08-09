# 🚀 Run & Deployment Guide — Read & Learn Kids App

---

## 1. Local Development Server

Start a simple local HTTP server from the project folder:

```powershell
# Python (recommended — no install needed on most systems)
python -m http.server 8080

# OR: Node.js http-server
npx http-server . -p 8080
```

Open in browser:
```
http://localhost:8080
```

---

## 2. Normal Deployment → GitHub Pages (Production)

Deploy the current `main` branch to live GitHub Pages:

```powershell
# 1. Commit all your changes to main
git add .
git commit -m "Build vX.X.X: your change description"
git push origin main

# 2. Deploy to GitHub Pages (gh-pages branch)
git push origin main:gh-pages --force
```

**Live URL:** https://j-kids.github.io/learning-app/

> ⏱️ GitHub Pages takes ~1-2 minutes to update after pushing.
> Check the **Build vX.X.X** badge in the app header to confirm the new build is live on your phone.

---

## 3. Mobile Preview — Feature Branch via ngrok

Test a **feature branch** on your mobile **without merging to main**.

### Step 1 — Install ngrok (one-time setup)

Download from https://ngrok.com/download and add to PATH, **or** install via Chocolatey:

```powershell
choco install ngrok
```

Or download the Windows `.zip` from:
https://ngrok.com/download → extract `ngrok.exe` → move to `C:\Windows\System32\`

### Step 2 — Start your local server

Make sure the local server is running (in one terminal):

```powershell
python -m http.server 8080
```

### Step 3 — Expose to internet via ngrok

In a **new terminal window**, run:

```powershell
ngrok http 8080
```

ngrok will display a public HTTPS URL like:

```
Forwarding  https://abc123.ngrok-free.app → http://localhost:8080
```

### Step 4 — Open on mobile

Open the `https://...ngrok-free.app` URL on your phone browser.

> ✅ Works with mobile camera (HTTPS is required for camera API)
> ✅ Tests the exact current branch code without any deployment
> ✅ Free — no account needed for basic usage
> ⚠️ Your PC must stay on and the local server must keep running while testing

### Stopping ngrok

Press `Ctrl + C` in the ngrok terminal window to stop the tunnel.

---

## 4. Branch Strategy

| Branch | Purpose | Deployed To |
|:---|:---|:---|
| `main` | Production-ready code | GitHub Pages (live) |
| `01/feature/improve-ocr` | AI Vision OCR feature dev | ngrok preview only |

### Merge feature branch into production after testing:

```powershell
git checkout main
git merge 01/feature/improve-ocr
git push origin main
git push origin main:gh-pages --force
```
