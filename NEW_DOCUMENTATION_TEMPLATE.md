# 📝 NEW DOCUMENTATION FILE TEMPLATE

Use this template when creating new .md documentation files.

---

## How to Create a New Documentation File

### Step 1: Choose File Name
Follow this naming convention:
- **Feature-based:** `FEATURE_NAME.md` (e.g., `PAYU_INTEGRATION.md`)
- **Status/Report:** `STATUS_TYPE_COMPLETE.md` (e.g., `DEPLOYMENT_COMPLETE.md`)
- **Guide/Reference:** `TOPIC_GUIDE.md` or `TOPIC_REFERENCE.md`

### Step 2: Use This Template

```markdown
# [Your Title]

**Last Updated:** [Date]  
**Status:** [✅ Complete / 🔄 In Progress / ⚠️ Needs Review]

---

## 📋 Overview

[2-3 sentence description of what this document covers]

---

## 🎯 Quick Summary

- ✅ What was completed
- ⚠️ What needs attention
- 🔗 Related documents

---

## 📊 Detailed Information

### Section 1: Main Topic
Content here...

### Section 2: Implementation Details
Content here...

---

## ✅ Checklist

- [ ] Feature completed
- [ ] Tests passed
- [ ] Documentation updated
- [ ] Deployed to production

---

## 📞 Related Resources

- Link to related doc 1
- Link to related doc 2

---

**Next Steps:** [What should happen next]

**Last Review:** [Date]
```

### Step 3: After Creating File

1. **Commit the file:**
   ```bash
   git add YOUR_FILE_NAME.md
   git commit -m "docs: Add YOUR_FILE_NAME.md documentation"
   ```

2. **Automatic Update:**
   - The post-commit hook will automatically:
     - Scan for new .md files
     - Update MASTER_PROJECT_STATUS.md
     - Add file count
     - Update timestamp

3. **Push to GitHub:**
   ```bash
   git push origin main
   ```

---

## 🔄 File Naming Best Practices

| Type | Format | Example |
|------|--------|---------|
| Feature | `FEATURE_NAME.md` | `PAYU_INTEGRATION.md` |
| Status | `FEATURE_STATUS.md` | `DEPLOYMENT_STATUS.md` |
| Complete | `FEATURE_COMPLETE.md` | `CRM_COMPLETE.md` |
| Guide | `TOPIC_GUIDE.md` | `DEPLOYMENT_GUIDE.md` |
| Quick Ref | `TOPIC_QUICK_REF.md` | `API_QUICK_REF.md` |
| Verification | `TOPIC_VERIFICATION.md` | `PAYU_VERIFICATION.md` |

---

## 📚 File Organization

Your new file will automatically be:
- ✅ Tracked in MASTER_PROJECT_STATUS.md
- ✅ Listed in DOCUMENTATION_INDEX.md (manual update recommended)
- ✅ Version controlled in git
- ✅ Deployed to GitHub

---

## 🚀 After File is Created

1. Update **DOCUMENTATION_INDEX.md** manually to add category link:
   ```markdown
   - **[YOUR_FILE_NAME.md](YOUR_FILE_NAME.md)** - Short description
   ```

2. Update **MASTER_PROJECT_STATUS.md** if adding new feature section

3. Commit both files:
   ```bash
   git add DOCUMENTATION_INDEX.md MASTER_PROJECT_STATUS.md
   git commit -m "docs: Add YOUR_FILE_NAME to documentation index"
   git push origin main
   ```

---

## ✨ Pro Tips

1. **Keep it focused:** One topic per file
2. **Use headers:** Proper markdown headers for structure
3. **Add timestamps:** Always include update date
4. **Link related files:** Cross-reference other docs
5. **Status badge:** Use emoji for quick status
6. **Checklist:** Include completion checklist
7. **Next steps:** End with what comes next

---

## 🔐 Remember Lock Password

When modifying locked files, you'll need: `Meera@123`

---

**Happy documenting! 📝**
