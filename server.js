console.log('🚀 Starting Zylm Energy Server...\n');

// Load modules with error handling
let express, cors, helmet, bcrypt, jwt, rateLimit, sqlite3, path, nodemailer, dotenv;

try {
    express = require('express');
    console.log('✅ Express loaded');
    
    cors = require('cors');
    console.log('✅ CORS loaded');
    
    helmet = require('helmet');
    console.log('✅ Helmet loaded');
    
    bcrypt = require('bcryptjs');
    console.log('✅ bcryptjs loaded');
    
    jwt = require('jsonwebtoken');
    console.log('✅ jsonwebtoken loaded');
    
    rateLimit = require('express-rate-limit');
    console.log('✅ express-rate-limit loaded');
    
    sqlite3 = require('sqlite3').verbose();
    console.log('✅ sqlite3 loaded');
    
    path = require('path');
    console.log('✅ path loaded');
    
    nodemailer = require('nodemailer');
    console.log('✅ nodemailer loaded');
    
    dotenv = require('dotenv');
    console.log('✅ dotenv loaded\n');
    
    dotenv.config();
    
} catch (error) {
    console.error('❌ Module loading error:', error.message);
    console.error('\n📦 Please run: npm install\n');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zylm-energy-secret-key-2025';
const RECIPIENT_EMAIL = 'divyanshujpr027@gmail.com';

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// Static serving for uploads
const fs = require('fs');
const multer = require('multer');
const uploadsRoot = path.join(__dirname, 'uploads');
const cvDir = path.join(uploadsRoot, 'cv');
try {
    if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot);
    if (!fs.existsSync(cvDir)) fs.mkdirSync(cvDir);
    console.log('✅ Upload directories ready');
} catch (err) {
    console.warn('⚠️ Unable to create upload directories:', err.message);
}
app.use('/uploads', express.static(uploadsRoot));

// Multer storage for CV uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, cvDir);
    },
    filename: function (req, file, cb) {
        const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, safeName);
    }
});

function fileFilter(req, file, cb) {
    const allowed = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF/DOC/DOCX allowed.'));
    }
}

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

// CV upload endpoint
app.post('/api/upload-cv', (req, res) => {
    upload.single('cvFile')(req, res, function (err) {
        if (err) {
            console.error('❌ CV upload error:', err.message);
            return res.status(400).json({ success: false, error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const fileUrl = `/uploads/cv/${req.file.filename}`;
        console.log('📥 CV uploaded:', fileUrl);
        res.json({ success: true, fileUrl });
    });
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Database setup
let db;
try {
    db = new sqlite3.Database('./database.sqlite', (err) => {
        if (err) {
            console.error('❌ Database connection error:', err.message);
        } else {
            console.log('✅ Connected to SQLite database');
        }
    });
} catch (error) {
    console.error('❌ Database initialization error:', error.message);
    process.exit(1);
}

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'divyanshujpr027@gmail.com',
        pass: process.env.EMAIL_PASS || 'vkqpjljktmwwaohe'
    }
});

// Test email configuration
async function testEmailConfig() {
    try {
        await emailTransporter.verify();
        console.log('✅ Email transporter ready');
        console.log('📧 Recipient:', RECIPIENT_EMAIL);
    } catch (error) {
        console.log('⚠️  Email config issue:', error.message);
    }
}

testEmailConfig();

// SMS sending helper (Twilio)
async function sendSMS(to, message) {
    const provider = process.env.SMS_PROVIDER || 'none';
    if (provider !== 'twilio') {
        console.log('ℹ️ SMS provider not configured or not Twilio. Skipping SMS send.');
        return false;
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM; // e.g., a Twilio phone number

    if (!sid || !token || !from) {
        console.log('⚠️ Twilio credentials missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM');
        return false;
    }

    try {
        const twilio = require('twilio');
        const client = twilio(sid, token);
        const result = await client.messages.create({
            body: message,
            to: `+91${to}`,
            from
        });
        console.log('📤 SMS sent via Twilio:', result.sid);
        return true;
    } catch (err) {
        console.error('❌ SMS send error:', err.message);
        return false;
    }
}

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )`, (err) => {
        if (err) console.error('Error creating users table:', err);
        else console.log('✅ Users table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS form_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT,
        email TEXT,
        phone TEXT,
        company TEXT,
        subject TEXT,
        message TEXT,
        department TEXT,
        form_data TEXT,
        status TEXT DEFAULT 'new',
        otp_verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating submissions table:', err);
        else console.log('✅ Form submissions table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS otp_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        otp TEXT NOT NULL,
        verified BOOLEAN DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating OTP table:', err);
        else console.log('✅ OTP verifications table ready');
    });

    // Create default admin
    const adminEmail = 'admin@zylm.in';
    const adminPassword = 'Admin123!';
    
    db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, row) => {
        if (!row && !err) {
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);
            db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 
                ['System Administrator', adminEmail, hashedPassword, 'admin'],
                function(err) {
                    if (!err) {
                        console.log('✅ Admin user created');
                        console.log('   📧 Email:', adminEmail);
                        console.log('   🔑 Password:', adminPassword);
                    }
                }
            );
        } else if (row) {
            console.log('✅ Admin user exists');
        }
    });
});

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Zylm Energy API',
        recipient: RECIPIENT_EMAIL
    });
});

// Send OTP
app.post('/api/send-otp', (req, res) => {
    const { phone } = req.body;
    
    if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    db.run(
        'INSERT INTO otp_verifications (phone, otp, expires_at) VALUES (?, ?, ?)',
        [cleanPhone, otp, expiresAt.toISOString()],
        function(err) {
            if (err) {
                console.error('❌ OTP error:', err);
                return res.status(500).json({ success: false, error: 'Failed to generate OTP' });
            }

            console.log(`📱 OTP ${otp} for ${cleanPhone}`);
            
            // Try sending the OTP via SMS if configured
            (async () => {
                const smsSent = await sendSMS(cleanPhone, `Your OTP is: ${otp}. Valid for 5 minutes.`);
                const includeTestOtp = (process.env.SEND_TEST_OTP_IN_RESPONSE === 'true') || !smsSent;
                res.json({ 
                    success: true, 
                    message: smsSent ? 'OTP SMS sent successfully' : 'OTP sent (SMS not configured)',
                    otp: includeTestOtp ? otp : undefined,
                    expiresIn: '5 minutes'
                });
            })();
        }
    );
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
        return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    db.get(
        'SELECT * FROM otp_verifications WHERE phone = ? AND otp = ? AND verified = 0 AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1',
        [cleanPhone, otp],
        (err, row) => {
            if (err || !row) {
                return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
            }

            db.run('UPDATE otp_verifications SET verified = 1 WHERE id = ?', [row.id]);
            
            console.log('✅ OTP verified:', cleanPhone);
            res.json({ 
                success: true, 
                message: 'OTP verified successfully',
                phone: cleanPhone
            });
        }
    );
});

// Submit form
app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;
        console.log('📝 Form received:', formData.formType);

        if (!formData.email) {
            return res.status(400).json({ success: false, error: 'Email required' });
        }

        // Check OTP for phone numbers - now mandatory for all forms with phone numbers
        if (formData.phone || formData.mobile) {
            const phone = (formData.phone || formData.mobile).replace(/\D/g, '');
            
            // Strict OTP verification check
            if (!formData.otpVerified) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'OTP verification is mandatory for all forms with phone numbers' 
                });
            }
            
            db.get(
                'SELECT * FROM otp_verifications WHERE phone = ? AND verified = 1 ORDER BY created_at DESC LIMIT 1',
                [phone],
                (err, row) => {
                    if (err || !row) {
                        return res.status(400).json({ 
                            success: false, 
                            error: 'OTP verification required' 
                        });
                    }
                    saveFormSubmission(formData, res);
                }
            );
        } else {
            // Only allow forms without phone numbers to proceed without OTP
            saveFormSubmission(formData, res);
        }

    } catch (error) {
        console.error('❌ Form error:', error);
        res.status(500).json({ success: false, error: 'Submission failed' });
    }
});

function saveFormSubmission(formData, res) {
    const name = formData.name || formData.fullName || formData.contactName || 'Anonymous';
    const email = formData.email;
    const phone = formData.phone || formData.mobile || '';
    const company = formData.company || formData.companyName || '';
    const subject = formData.subject || '';
    const message = formData.message || '';
    const department = formData.department || '';
    const otpVerified = !!(formData.phone || formData.mobile);

    db.run(
        `INSERT INTO form_submissions (type, name, email, phone, company, subject, message, department, form_data, otp_verified) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [formData.formType, name, email, phone, company, subject, message, department, JSON.stringify(formData), otpVerified],
        async function(err) {
            if (err) {
                console.error('❌ DB error:', err);
                return res.status(500).json({ success: false, error: 'Failed to save' });
            }
            
            console.log('✅ Form saved, ID:', this.lastID);
            
            // Send email and handle result
            const emailSent = await sendEmail(formData);
            
            res.json({ 
                success: true, 
                message: 'Form submitted successfully!',
                submissionId: this.lastID,
                otpVerified: otpVerified,
                emailSent: emailSent
            });
        }
    );
}

async function sendEmail(formData) {
    try {
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const recipient = RECIPIENT_EMAIL;
        console.log('📧 Attempting to send email to:', recipient);
        console.log('📋 Form data:', {
            type: formData.formType,
            name: formData.name || formData.fullName,
            email: formData.email,
            phone: formData.phone || formData.mobile,
            cvFilePath: formData.cvFilePath
        });
        
        let emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; color: #333; }
                .container { max-width: 700px; margin: 0 auto; }
                .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: white; }
                .field { margin: 10px 0; padding: 10px; background: #f5f5f5; border-left: 3px solid #1976d2; }
                .footer { padding: 20px; background: #37474f; color: #b0bec5; text-align: center; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌿 Zylm Energy</h1>
                    <p>${formData.formType.toUpperCase()} FORM SUBMISSION</p>
                </div>
                <div class="content">
                    <h2>Form Details</h2>
                    <table>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>`;
        
        Object.entries(formData).forEach(([key, value]) => {
            if (value && !['formType', 'timestamp', 'otpVerified', 'recipientEmail', 'source'].includes(key)) {
                emailBody += `
                        <tr>
                            <td><strong>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</strong></td>
                            <td>${value}</td>
                        </tr>`;
            }
        });
        
        emailBody += `
                        <tr>
                            <td><strong>Submission Time</strong></td>
                            <td>${timestamp}</td>
                        </tr>
                        <tr>
                            <td><strong>OTP Verified</strong></td>
                            <td>${formData.otpVerified ? '✅ Yes' : '❌ No'}</td>
                        </tr>
                    </table>
                </div>
                <div class="footer">
                    <p>Automated email from Zylm Energy website</p>
                    <p>📍 B1/2, Alankar Plaza, Jaipur | 📞 +91 141 4116525</p>
                </div>
            </div>
        </body>
        </html>`;

        // Attach CV if available
        const attachments = [];
        try {
            if (formData.cvFilePath) {
                // Handle both relative and absolute paths
                let fileDiskPath;
                if (formData.cvFilePath.startsWith('/uploads/cv/')) {
                    // Remove leading slash and construct full path
                    const filename = path.basename(formData.cvFilePath);
                    fileDiskPath = path.join(__dirname, 'uploads', 'cv', filename);
                } else {
                    fileDiskPath = formData.cvFilePath;
                }
                
                // Check if file exists before attaching
                const fs = require('fs');
                if (fs.existsSync(fileDiskPath)) {
                    const filename = path.basename(fileDiskPath);
                    attachments.push({ 
                        filename: `CV_${formData.fullName || formData.name || 'Resume'}_${filename}`, 
                        path: fileDiskPath 
                    });
                    console.log('📎 CV attachment added:', filename);
                } else {
                    console.warn('⚠️ CV file not found:', fileDiskPath);
                }
            } else if (formData.cvLink) {
                // Handle URL-based CV links (if any)
                attachments.push({ filename: 'CV.pdf', path: formData.cvLink });
            }
        } catch (attErr) {
            console.warn('⚠️ Attachment handling issue:', attErr.message);
        }

        const mailOptions = {
            from: process.env.EMAIL_USER || 'divyanshujpr027@gmail.com',
            to: recipient,
            subject: `[Zylm Energy] ${formData.formType.toUpperCase()} - ${formData.name || formData.fullName || 'New Submission'}`,
            html: emailBody,
            attachments: attachments.length ? attachments : undefined
        };

        console.log('📤 Sending email with options:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            attachmentCount: attachments.length
        });

        const result = await emailTransporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', result.messageId);
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:');
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.code);
        console.error('   Error response:', error.response);
        return false;
    }
}

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ? AND status = "active"', [email], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });

        console.log('✅ Login:', user.email);
        
        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    });
});

// Serve files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 ===============================================');
    console.log('   Zylm Energy Server Running');
    console.log('   ===============================================');
    console.log('🌐 URL: http://localhost:' + PORT);
    console.log('🔐 Admin: http://localhost:' + PORT + '/admin.html');
    console.log('\n📋 Admin Login:');
    console.log('   📧 admin@zylm.in');
    console.log('   🔑 Admin123!');
    console.log('\n📧 Forms sent to: ' + RECIPIENT_EMAIL);
    console.log('📱 OTP verification: Enabled');
    console.log('\n✅ Server ready! Press Ctrl+C to stop');
    console.log('================================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    db.close(() => {
        console.log('✅ Database closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});