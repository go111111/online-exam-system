# Login System Migration Guide

## Changes Summary

This document outlines all changes made to migrate from username/password authentication to **QQ Email + Password** authentication using **Element Plus (el-form)**.

---

## 📋 Files Modified

### 1. **package.json**

- Added `element-plus: ^2.6.3` dependency

### 2. **database.sql**

- **Before:** users table had `username` field
- **After:** users table now uses `email` field (QQ email format)
- Changed role default from 'user' to 'student'
- Updated default admin from `Admin` to `admin@qq.com`

```sql
-- Updated users table structure
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,  -- Changed from username
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),  -- Changed from idx_username
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. **server.ts**

- **SQLite Table Schema:** Changed `username` to `email` in users table
- **Registration API (`/api/register`):**
  - Changed to accept `email` instead of `username`
  - Added QQ email validation (format: `xxx@qq.com`)
  - Password validation: 6-20 characters
  - Default role changed to 'student'

- **Login API (`/api/login`):**
  - Changed to accept `email` instead of `username`
  - Case-insensitive email comparison
  - JWT token now includes `email` instead of `username`

- **Default Admin User:**
  - Email: `admin@qq.com`
  - Password: `admin123` (hashed)

### 4. **src/main.ts**

- Added Element Plus import and registration
- Initialized Element Plus CSS

```typescript
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
// ...
app.use(ElementPlus);
```

### 5. **src/views/Login.vue** (Completely Rewritten)

- **Component Type:** Now uses Composition API with TypeScript
- **Form Library:** Element Plus `el-form`
- **Removed:**
  - HTML input elements
  - Custom CSS styling
  - `AlertTriangle` icon from lucide-vue-next
- **Added:**
  - `el-form` component with validation rules
  - `el-input` with email and password fields
  - `el-button` for submit and toggle actions
  - Password field validation: 6-20 characters
  - Email field validation: QQ email format only
  - Loading state during submission
  - Improved UI with gradient backgrounds and better styling

#### New Features:

✅ Professional el-form validation
✅ Real-time form error messages
✅ Password strength indicator (6-20 chars)
✅ QQ email format validation
✅ Smooth transitions between login/register modes
✅ Element Plus message notifications
✅ Loading states on buttons

---

## 🔄 Migration Steps for Users

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Update Database**

- If using MySQL, run: `mysql -u user -p database < database.sql`
- If using SQLite, the schema will auto-initialize when server starts

### 3. **Start Server**

```bash
npm run dev
```

### 4. **Default Admin Credentials**

- **Email:** `admin@qq.com`
- **Password:** `admin123`

### 5. **Register New Users**

- Users must register with QQ email (format: `qqnumber@qq.com`)
- Password must be 6-20 characters

---

## 📝 Important Notes

1. **QQ Email Only:** The system now only accepts QQ email addresses for registration/login
   - Format validation: `^\d+@qq\.com$`

2. **Password Requirements:**
   - Minimum: 6 characters
   - Maximum: 20 characters
   - Case-sensitive

3. **User Role Changes:**
   - Old role 'user' → New role 'student'
   - 'admin' role remains the same

4. **Email Case Handling:**
   - All emails are converted to lowercase for storage and comparison

5. **Token Changes:**
   - JWT token now includes `email` instead of `username`
   - User object in localStorage includes `email`

---

## 🐛 Troubleshooting

### Issue: "Email already exists"

- The email is already registered in the system

### Issue: "Please use QQ email"

- Email doesn't match QQ format (`xxx@qq.com`)

### Issue: "Password must be 6-20 characters"

- Password is outside the 6-20 character range

### Issue: Element Plus styles not showing

- Ensure `npm install` was run
- Check that `element-plus` is in your node_modules

---

## 🔐 Security Considerations

- All passwords are hashed with bcryptjs (salt rounds: 10)
- Email validation prevents non-QQ email accounts
- Password complexity is enforced at registration
- Form validation happens both client-side and server-side

---

**Last Updated:** April 24, 2026
**Status:** ✅ Migration Complete
