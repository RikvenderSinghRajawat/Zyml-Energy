# Clean Air Solutions - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Gmail account (for email notifications)

### Installation Steps

#### 1. Install Dependencies
```bash
npm install
```

Required packages:
- express
- cors
- helmet
- bcryptjs
- jsonwebtoken
- express-rate-limit
- sqlite3
- nodemailer
- dotenv

#### 2. Configure Email Settings

**Create a `.env` file in the root directory:**

```env
PORT=3000
JWT_SECRET=your-random-secret-key-here
EMAIL_USER=divyanshujpr027@gmail.com
EMAIL_PASS=your-gmail-app-password
```

**Get Gmail App Password:**

1. Go to Google Account: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already enabled)
3. Visit App Passwords: https://myaccount.google.com/apppasswords
4. Select app: **Mail**
5. Select device: **Other (Custom name)**
6. Enter name: **Clean Air Solutions**
7. Click **Generate**
8. Copy the 16-character password (ignore spaces)
9. Paste it in `.env` as `EMAIL_PASS`

#### 3. Start the Server

```bash
node server.js
```

Or for development with auto-restart:
```bash
npm install -g nodemon
nodemon server.js
```

### 4. Access the Application

- **Main Website:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin.html

## 🔐 Admin Login

**Default Credentials:**
- Email: `admin@zylm.in`
- Password: `Admin123!`

**⚠️ Important:** Change these credentials after first login!

## 📧 Email Configuration

All form submissions from these pages will be sent to: **divyanshujpr027@gmail.com**

### Supported Forms:
1. **Contact Form** - Main contact page
2. **Career Form** - Job applications
3. **Vendor Form** - Vendor registrations
4. **Product Inquiry Form** - Product-specific inquiries
5. **Newsletter Form** - Newsletter subscriptions

### Email Features:
- ✅ Beautiful HTML email templates
- ✅ All form data included
- ✅ Timestamp in IST timezone
- ✅ Stored in database
- ✅ Visible in admin panel
- ✅ Non-blocking (forms submit even if email fails)

## 📊 Admin Panel Features

### Dashboard
- Total products count
- Total users count
- Form submissions count
- Notifications count
- Recent activity
- System alerts

### Product Management
- View all products
- Add new products
- Edit existing products
- Delete products (except static ones)
- Product categories: outdoor, industrial, vehicle, emission, residential, commercial

### User Management
- View all users
- Add new users
- Edit user details
- Assign roles: Admin, Editor, Viewer
- Manage user status

### Form Submissions
- View all form submissions
- Filter by form type
- Filter by date
- View full submission details
- Update submission status
- Delete submissions
- Export to CSV

### Settings
- General settings
- Email configuration
- Security settings
- Backup & restore

## 🗄️ Database

The application uses SQLite database (`database.sqlite`) with the following tables:

### Tables:
1. **users** - Admin users
2. **products** - Product catalog
3. **form_submissions** - All form submissions
4. **notifications** - System notifications

The database is created automatically on first run with sample data.

## 🔧 Troubleshooting

### Email Not Sending

**Check 1: Gmail App Password**
- Ensure you're using an App Password, not your regular Gmail password
- App Password should be 16 characters
- Remove any spaces from the password

**Check 2: 2-Step Verification**
- Must be enabled on your Google account
- Check at: https://myaccount.google.com/security

**Check 3: Test Email**
```bash
# After logging into admin panel
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/test-email
```

**Check 4: Server Logs**
- Look for email status in console
- Should show "✅ Email sent successfully" or error details

### Cannot Login to Admin Panel

**Solution 1: Use Default Credentials**
- Email: admin@zylm.in
- Password: Admin123!

**Solution 2: Reset Database**
```bash
# Delete database and restart
rm database.sqlite
node server.js
```

### Form Submissions Not Saving

**Check 1: Server Running**
```bash
# Verify server is running on port 3000
curl http://localhost:3000/api/health
```

**Check 2: Check Console Logs**
- Look for "Form submission received" in server console
- Check for any error messages

**Check 3: Database Permissions**
```bash
# Ensure write permissions
chmod 666 database.sqlite
```

### Port Already in Use

**Solution: Change Port**
```env
# In .env file
PORT=3001
```

Or kill existing process:
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 PID
```

## 📝 API Endpoints

### Public Endpoints
- `POST /api/submit-form` - Submit any form
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `GET /api/health` - Health check

### Protected Endpoints (Require Authentication)
- `POST /api/login` - Admin login
- `GET /api/verify-token` - Verify JWT token
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `GET /api/forms` - Get all form submissions (Admin only)
- `PUT /api/forms/:id/status` - Update form status (Admin only)
- `DELETE /api/forms/:id` - Delete form (Admin only)
- `GET /api/test-email` - Send test email (Admin only)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- CORS enabled
- SQL injection protection
- XSS protection
- Admin-only endpoints

## 📦 File Structure

```
clean-air-solutions/
├── admin.html              # Admin panel HTML
├── index.html             # Main website
├── server.js              # Backend server (USE THIS)
├── admin.js               # Admin panel logic (USE THIS)
├── form-handler.js        # Form handling (USE THIS)
├── database.sqlite        # SQLite database (auto-created)
├── .env                   # Environment variables
├── package.json           # Dependencies
└── css/
    ├── style.css
    ├── admin.css
    └── responsive.css
```

## 🎯 Testing Checklist

- [ ] Server starts without errors
- [ ] Admin login works
- [ ] Dashboard loads statistics
- [ ] Products page shows all products
- [ ] Can add new product
- [ ] Can edit product
- [ ] Can delete product (non-static)
- [ ] Users page loads
- [ ] Can add new user
- [ ] Contact form submits successfully
- [ ] Email received at divyanshujpr027@gmail.com
- [ ] Form appears in admin panel
- [ ] Career form works
- [ ] Vendor form works
- [ ] Product inquiry form works

## 🆘 Support

If you encounter any issues:

1. Check server console for error messages
2. Verify `.env` file is configured correctly
3. Ensure Gmail App Password is correct
4. Check database permissions
5. Verify port 3000 is available
6. Review this guide's troubleshooting section

## 📈 Next Steps

1. **Change default admin password**
2. **Add your logo and branding**
3. **Customize email templates** (in server.js `generateEmailContent()`)
4. **Add more products**
5. **Create additional admin users**
6. **Set up SSL certificate for production**
7. **Configure domain name**
8. **Set up automatic backups**

## 🌟 Features Summary

✅ Complete admin panel with authentication  
✅ Form submissions sent to divyanshujpr027@gmail.com  
✅ All forms stored in database  
✅ Beautiful email notifications  
✅ Product management system  
✅ User management system  
✅ Dashboard with statistics  
✅ Secure JWT authentication  
✅ Rate limiting protection  
✅ SQLite database  
✅ Responsive design  
✅ Export functionality  

---

**Made with ❤️ for Clean Air Solutions**