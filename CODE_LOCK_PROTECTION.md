# 🔒 CODE LOCK PROTECTION SYSTEM v1.0.0

**Status:** ACTIVE  
**Lock Password:** `Meera@123`  
**Last Updated:** December 25, 2025

---

## 🎯 What is Locked?

These files are **PERMANENTLY LOCKED** and cannot be modified without entering the unlock password:

1. **`app/page.tsx`** - Landing Page
   - Hero section, CTA buttons, layout

2. **`app/workshops/page.tsx`** - Workshops Listing Page
   - Category/Workshop/Mode/Language/Currency filters
   - 3-card pagination
   - Card layout and styling

3. **`app/workshops/[id]/page.tsx`** - Workshop Detail Page
   - 5-line About This Workshop section
   - 7-line Workshop Information
   - Register buttons and styling

4. **`app/registernow/page.tsx`** - Registration Page
   - Date booking interface
   - Form layout

5. **`components/WorkshopDateBooking.tsx`** - Date Booking Component
   - Calendar and date selection logic

---

## 🔐 How the Lock Works

### **Automatic Protection**
- Every time you try to `git commit`, the pre-commit hook runs
- It checks if any locked files were modified
- If YES → asks for password
- If password is correct → allows commit
- If password is wrong → blocks commit

### **Password**
```
Meera@123
```

---

## 📋 Locked Commit History

| Commit | File | Feature |
|--------|------|---------|
| `97e8aa8` | `app/workshops/page.tsx` | Full locked workshops page with category filter |
| `82edb47` | `app/workshops/[id]/page.tsx` | 5-line About This Workshop section |
| `ca90a39` | `app/workshops/page.tsx` | 3-card pagination |
| `2c2ad29` | `app/workshops/page.tsx` | Slots display - black text only |
| `ce2c488` | All pages | Slots styling finalized |
| `2389ca8` | `app/workshops/page.tsx` | Category filter closed by default |

---

## ✅ Testing the Lock

### **Test 1: Try to Modify a Locked File**

```bash
# Edit a locked file
echo "// test change" >> app/workshops/page.tsx

# Try to commit
git add app/workshops/page.tsx
git commit -m "test commit"

# ❌ You'll see the lock prompt:
# 🔒 WEBSITE CODE LOCK PROTECTION ACTIVATED 🔒
# Enter unlock password: _
```

### **Test 2: Enter Wrong Password**
```
🔐 Enter unlock password: wrong123
❌ INCORRECT PASSWORD!
🛑 COMMIT BLOCKED
```

### **Test 3: Enter Correct Password**
```
🔐 Enter unlock password: Meera@123
✅ Password correct! Lock bypassed.
📝 Proceeding with commit...
```

---

## 🚀 If You Need to Modify Locked Files

### **With Password (Authorized Changes)**

```bash
# 1. Edit the locked file
nano app/workshops/page.tsx

# 2. Stage your changes
git add app/workshops/page.tsx

# 3. Try to commit
git commit -m "fix: important change"

# 4. Enter password when prompted
🔐 Enter unlock password: Meera@123

# ✅ Commit accepted!
```

### **Without Password (Blocked)**

If you try without the password:
- ❌ Commit will be rejected
- 🛑 File changes will NOT be committed
- 📝 You can unstage the changes with: `git reset HEAD app/workshops/page.tsx`

---

## 🔧 How to Verify Lock is Active

```bash
# Check if hook exists
ls -la .git/hooks/pre-commit

# Output should show:
# -rwxr-xr-x (executable)

# View the hook content
cat .git/hooks/pre-commit
```

---

## 📚 Protected Release Tag

All locked files are preserved in git tag: `v1.0.0-website-locked`

**To restore locked files if accidentally modified:**

```bash
# Restore ALL locked files from release tag
git checkout v1.0.0-website-locked -- \
  app/page.tsx \
  app/workshops/page.tsx \
  app/workshops/\[id\]/page.tsx \
  app/registernow/page.tsx \
  components/WorkshopDateBooking.tsx
```

---

## ⚠️ Important Notes

1. **Password is in this file** - Keep it secure
2. **Hook is local** - Each developer needs to have the hook active
3. **Prevents accidental changes** - Helps maintain code stability
4. **Allows authorized changes** - Password bypasses for legitimate updates
5. **Git history preserved** - Lock doesn't prevent undo/revert

---

## 📞 Lock Management

**Lock Password:** `Meera@123`  
**Lock Administrator:** Mohan Kalburgi  
**Contact:** mohankalburgi@gmail.com

---

## Version History

| Version | Date | Status |
|---------|------|--------|
| 1.0.0 | Dec 22, 2025 | LOCKED - Website pages stable |
| - | Dec 25, 2025 | Password protection added |

---

**🎉 Your website pages are now protected from accidental modifications!**
