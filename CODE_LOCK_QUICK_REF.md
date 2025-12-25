# 🔒 CODE LOCK - QUICK REFERENCE

## 🛡️ What's Protected?

✅ LOCKED FILES (Cannot modify without password):
- `app/page.tsx` (Landing)
- `app/workshops/page.tsx` (Workshops list)
- `app/workshops/[id]/page.tsx` (Workshop detail)
- `app/registernow/page.tsx` (Registration)
- `components/WorkshopDateBooking.tsx` (Date booking)

## 🔐 Unlock Password

```
Meera@123
```

## ⚡ How It Works

1. **Edit a locked file** → make changes
2. **Run `git commit`** → lock system activates
3. **Enter password** → commit proceeds
4. **No password** → commit is blocked

## 📝 Example Usage

```bash
# You want to fix a bug in app/workshops/page.tsx
nano app/workshops/page.tsx

# Make your changes, then:
git add app/workshops/page.tsx
git commit -m "fix: bug in filters"

# System asks:
# 🔐 Enter unlock password: ___

# Type:
# Meera@123

# ✅ Commit accepted!
```

## ❌ If You Enter Wrong Password

```
❌ INCORRECT PASSWORD!
🛑 COMMIT BLOCKED
```

**Fix:** 
```bash
git reset HEAD app/workshops/page.tsx
# Your changes are safe, just not committed
```

## ✅ How to Know Lock is Active

Try this command:
```bash
cat .git/hooks/pre-commit | grep "WEBSITE CODE LOCK"
```

If you see the lock message → **Protection is ACTIVE** ✅

## 🚨 Emergency: Bypass Lock

If you absolutely need to bypass (rare):
1. Delete the hook: `rm .git/hooks/pre-commit`
2. Make your changes
3. **Restore the hook:** `git checkout .git/hooks/pre-commit`

## 📖 Full Documentation

See `CODE_LOCK_PROTECTION.md` for complete details.

---

**Password: `Meera@123`** 🔐
