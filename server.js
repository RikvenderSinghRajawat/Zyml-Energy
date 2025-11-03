// Clean Air Solutions Server
// Production-ready server with OTP verification and form handling

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Environment variables
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zylm-energy-secret-key';
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'divyanshujpr027@gmail.com';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const DLT_API_KEY = process.env.DLT_API_KEY;
const DLT_TEMPLATE_ID = process.env.DLT_TEMPLATE_ID;
const DLT_ENTITY_ID = process.env.DLT_ENTITY_ID;
const DLT_SENDER_ID = process.env.DLT_SENDER_ID || 'ZYLMEN';
const DLT_API_URL = process.env.DLT_API_URL || 'https://api.example.com/sms/send';

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Create upload directories
const uploadsDir = path.join(__dirname, 'uploads');
const cvDir = path.join(uploadsDir, 'cv');

try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    if (!fs.existsSync(cvDir)) fs.mkdirSync(cvDir);
} catch (err) {
    // Handle directory creation error
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, cvDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'cv-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only PDF, DOC, DOCX files are allowed'));
    }
});

// Handle CV uploads
app.post('/api/upload-cv', upload.single('cv'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        const fileUrl = `/uploads/cv/${req.file.filename}`;
        res.json({ success: true, fileUrl });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Initialize database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        return;
    }
    
    initializeDatabase();
});

// Email configuration
let transporter = null;
try {
    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT == 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            }
        });
    }
} catch (error) {
    // Email config issue
}

// SMS sending function
async function sendSMS(to, message) {
    // Skip if DLT not configured
    if (!DLT_API_KEY || !DLT_TEMPLATE_ID || !DLT_ENTITY_ID) {
        return { success: false, error: 'DLT credentials missing' };
    }
    
    const senderId = DLT_SENDER_ID;
    const templateId = DLT_TEMPLATE_ID;
    const entityId = DLT_ENTITY_ID;
    
    try {
        // If DLT API URL is not set, simulate success for development
        if (!DLT_API_URL.includes('example.com')) {
            const response = await axios.post(DLT_API_URL, {
                apikey: DLT_API_KEY,
                sender: senderId,
                template_id: templateId,
                entity_id: entityId,
                message,
                mobile: to
            });
            
            if (response.data && response.data.status === 'success') {
                return { success: true };
            } else {
                return { success: false, error: response.data };
            }
        } else {
            // Simulate success for development
            return { success: true, simulated: true };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        name TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        // Create admin user if not exists
        createAdminUser();
    });
    
    // Form submissions table
    db.run(`CREATE TABLE IF NOT EXISTS form_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_type TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        cv_path TEXT,
        department TEXT,
        company TEXT,
        subject TEXT,
        product TEXT,
        verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        // Form submissions table ready
    });
    
    // OTP verifications table
    db.run(`CREATE TABLE IF NOT EXISTS otp_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        otp TEXT,
        verified BOOLEAN DEFAULT 0,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        // OTP verifications table ready
    });
}

// Create admin user if not exists
function createAdminUser() {
    const adminEmail = 'admin@zylm.in';
    const adminPassword = 'Admin123!';
    
    db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, user) => {
        if (err || user) {
            return;
        }
        
        const hashedPassword = bcrypt.hashSync(adminPassword, 10);
        db.run('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)', 
            [adminEmail, hashedPassword, 'Admin User', 'admin']);
    });
}

// Send OTP via DLT service
async function sendOTPViaDLT(phone, otp) {
    // Skip if DLT not configured
    if (!DLT_API_KEY || !DLT_TEMPLATE_ID || !DLT_ENTITY_ID) {
        return { success: false, error: 'DLT credentials missing' };
    }
    
    try {
        // Format message according to template
        const message = `Your OTP for Zylm Energy is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;
        
        // Send SMS via DLT service
        if (DLT_API_URL && !DLT_API_URL.includes('example.com')) {
            const response = await axios.post(DLT_API_URL, {
                apikey: DLT_API_KEY,
                sender: DLT_SENDER_ID,
                template_id: DLT_TEMPLATE_ID,
                entity_id: DLT_ENTITY_ID,
                message,
                mobile: phone
            });
            
            if (response.data && response.data.status === 'success') {
                return { success: true };
            } else {
                return { success: false, error: response.data };
            }
        } else {
            // Simulate success for development
            return { success: true, simulated: true };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Generate and send OTP
app.post('/api/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || phoneNumber.length !== 10) {
            return res.status(400).json({ success: false, message: 'Invalid phone number' });
        }
        
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes
        
        // Store OTP in database
        db.run('INSERT INTO otp_verifications (phone, otp, expires_at) VALUES (?, ?, ?)',
            [cleanPhone, otp, expiryTime.toISOString()]);
        
        // Send OTP via DLT service
        const smsSent = await sendOTPViaDLT(cleanPhone, otp);
        
        // Return success with OTP for development in non-production environments
        const isDev = process.env.NODE_ENV !== 'production';
        res.json({ 
            success: true, 
            message: 'OTP sent successfully',
            otp: isDev ? otp : undefined,
            dltStatus: smsSent.success
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
        return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    db.get(
        'SELECT * FROM otp_verifications WHERE phone = ? AND otp = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY id DESC LIMIT 1',
        [cleanPhone, otp],
        (err, verification) => {
            if (err || !verification) {
                return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
            }
            
            // Mark OTP as verified
            db.run('UPDATE otp_verifications SET verified = 1 WHERE id = ?', [verification.id]);
            
            res.json({ success: true, message: 'OTP verified successfully' });
        }
    );
});

// Handle form submissions
app.post('/api/submit-form', (req, res) => {
    const formData = req.body;
    
    // Validate required fields
    if (!formData.email || !formData.formType) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Check if phone verification is required and verified
    if (formData.phone) {
        db.get(
            'SELECT * FROM otp_verifications WHERE phone = ? AND verified = 1 ORDER BY id DESC LIMIT 1',
            [formData.phone.replace(/\D/g, '')],
            (err, verification) => {
                if (err || !verification) {
                    return res.status(400).json({ success: false, message: 'Phone verification required' });
                }
                
                // Phone verified, proceed with form submission
                saveFormAndSendEmail(formData, res);
            }
        );
    } else {
        // No phone provided, proceed without verification
        saveFormAndSendEmail(formData, res);
    }
});

// Save form to database and send email
function saveFormAndSendEmail(formData, res) {
    // Save to database
    const { formType, name, email, phone, message, cvPath, department, company, subject, product } = formData;
    
    db.run(
        `INSERT INTO form_submissions 
        (form_type, name, email, phone, message, cv_path, department, company, subject, product, verified) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [formType, name, email, phone, message, cvPath, department, company, subject, product, phone ? 1 : 0],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to save form' });
            }
            
            const formId = this.lastID;
            
            // Send email notification
            sendFormEmail(formData, formId)
                .then(() => {
                    res.json({ success: true, message: 'Form submitted successfully', formId });
                })
                .catch(error => {
                    // Form saved but email failed
                    res.json({ 
                        success: true, 
                        message: 'Form saved but email notification failed', 
                        formId,
                        emailError: error.message
                    });
                });
        }
    );
}

// Send form email
async function sendFormEmail(formData, formId) {
    if (!transporter) {
        throw new Error('Email transport not configured');
    }
    
    const recipient = RECIPIENT_EMAIL;
    const { formType, name, email, phone, message, cvPath, department, company, subject, product } = formData;
    
    // Build email content
    let htmlContent = `
        <h2>New Form Submission - ${formType}</h2>
        <p><strong>Form ID:</strong> ${formId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p><strong>Name:</strong> ${name || 'Not provided'}</p>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
    `;
    
    // Add form-specific fields
    if (formType === 'contact') {
        htmlContent += `
            <p><strong>Subject:</strong> ${subject || 'Not provided'}</p>
            <p><strong>Message:</strong> ${message || 'Not provided'}</p>
        `;
    } else if (formType === 'career') {
        htmlContent += `
            <p><strong>Department:</strong> ${department || 'Not provided'}</p>
            <p><strong>Message:</strong> ${message || 'Not provided'}</p>
            <p><strong>CV:</strong> ${cvPath ? `<a href="${cvPath}">View CV</a>` : 'Not provided'}</p>
        `;
    } else if (formType === 'vendor') {
        htmlContent += `
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>Message:</strong> ${message || 'Not provided'}</p>
        `;
    } else if (formType === 'product') {
        htmlContent += `
            <p><strong>Product:</strong> ${product || 'Not provided'}</p>
            <p><strong>Message:</strong> ${message || 'Not provided'}</p>
        `;
    } else if (formType === 'newsletter') {
        // Newsletter form has minimal fields
    } else if (formType === 'legal') {
        htmlContent += `
            <p><strong>Subject:</strong> ${subject || 'Not provided'}</p>
            <p><strong>Message:</strong> ${message || 'Not provided'}</p>
        `;
    } else if (formType === 'sales') {
        htmlContent += `
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>Product Interest:</strong> ${product || 'Not provided'}</p>
            <p><strong>Message:</strong> ${message || 'Not provided'}</p>
        `;
    } else {
        // Generic form
        htmlContent += `
            <p><strong>Subject:</strong> ${subject || 'Not provided'}</p>
            <p><strong>Message:</strong> ${message || 'Not provided'}</p>
        `;
    }
    
    // Add verification status
    htmlContent += `
        <hr>
        <p><strong>Phone Verified:</strong> ${phone ? 'Yes' : 'N/A'}</p>
    `;
    
    // Email options
    const mailOptions = {
        from: SMTP_USER || 'noreply@zylmenergy.com',
        to: recipient,
        subject: `New ${formType} Form Submission - Zylm Energy`,
        html: htmlContent
    };
    
    // Add CV attachment if available
    if (cvPath && cvPath.startsWith('/uploads/')) {
        const filename = path.basename(cvPath);
        const fileDiskPath = path.join(__dirname, cvPath);
        
        if (fs.existsSync(fileDiskPath)) {
            mailOptions.attachments = [
                {
                    filename,
                    path: fileDiskPath
                }
            ];
        }
    }
    
    // Send email
    return transporter.sendMail(mailOptions);
}

// Admin login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
            expiresIn: 86400 // 24 hours
        });
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });
    });
});

// Server health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Server status with features
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'ok',
        features: [
            'Form Submission System',
            'OTP Verification System',
            'DLT Compliance',
            'Email Notifications',
            'File Uploads'
        ]
    });
});

// Start server
const server = app.listen(PORT, () => {
    // Server is running
});

// Graceful shutdown
process.on('SIGINT', () => {
    server.close(() => {
        db.close();
        process.exit(0);
    });
});

// Error handling
process.on('uncaughtException', (err) => {
    // Uncaught exception
});

process.on('unhandledRejection', (err) => {
    // Unhandled rejection
});