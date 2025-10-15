const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clean-air-solutions-secret-2025';

// IMPORTANT: Email Configuration for divyanshujpr027@gmail.com
const RECIPIENT_EMAIL = 'divyanshujpr027@gmail.com';

// Middleware
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('.'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Database setup
const db = new sqlite3.Database('./database.sqlite');

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'divyanshujpr027@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-gmail-app-password'
    }
});

// Test email configuration
async function testEmailConfig() {
    try {
        await emailTransporter.verify();
        console.log('✅ Email transporter ready');
        console.log('📧 Emails will be sent to:', RECIPIENT_EMAIL);
    } catch (error) {
        console.log('⚠️ Email configuration issue:', error.message);
        console.log('📝 To enable email notifications:');
        console.log('   1. Create a .env file in root directory');
        console.log('   2. Add: EMAIL_USER=divyanshujpr027@gmail.com');
        console.log('   3. Add: EMAIL_PASS=your-gmail-app-password');
        console.log('   4. Enable 2-Step Verification in your Gmail account');
        console.log('   5. Generate App Password at: https://myaccount.google.com/apppasswords');
        console.log('   6. Use the 16-character app password (remove spaces)');
    }
}

testEmailConfig();

// Initialize database
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )`);

    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price DECIMAL(10,2) DEFAULT 0,
        image_url TEXT,
        specifications TEXT,
        features TEXT,
        status TEXT DEFAULT 'active',
        is_static BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Form submissions table
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Notifications table
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read_status BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default admin user
    const adminEmail = 'admin@zylm.in';
    const adminPassword = 'Admin123!';
    
    db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);
            db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 
                ['System Administrator', adminEmail, hashedPassword, 'admin'],
                function(err) {
                    if (err) {
                        console.error('Error creating admin:', err);
                    } else {
                        console.log('✅ Default admin user created');
                        console.log('📧 Email:', adminEmail);
                        console.log('🔐 Password:', adminPassword);
                    }
                }
            );
        } else {
            console.log('✅ Admin user exists');
        }
    });

    // Insert sample products
    const sampleProducts = [
        {
            name: 'AirBin Outdoor',
            description: 'Next-generation outdoor air purification system with IoT and AI capabilities',
            category: 'outdoor',
            price: 2999,
            image_url: 'https://images.unsplash.com/photo-1558618666-fcd25856cd63?w=400',
            specifications: JSON.stringify({
                sensors: 'PM2.5, PM10, CO, NO2, O3, SO2',
                coverage: '500 sqm',
                power: 'Solar/Grid'
            }),
            features: JSON.stringify(['24/7 automated operation', 'IoT and AI control', 'Environmental sensors']),
            is_static: 1
        },
        {
            name: 'AirBin Smog',
            description: 'High-pressure water mist system for effective dust suppression',
            category: 'industrial',
            price: 4500,
            image_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400',
            specifications: JSON.stringify({
                range: 'Up to 100m',
                capacity: '2000L',
                power: 'Diesel/Electric'
            }),
            features: JSON.stringify(['High-pressure water technology', 'Fine mist generation', 'Large area coverage']),
            is_static: 1
        },
        {
            name: 'AirBin Pole',
            description: 'Integrated temperature control and air purification system',
            category: 'outdoor',
            price: 3200,
            image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
            specifications: JSON.stringify({
                coverage: '300 sqm',
                temperature_reduction: 'Up to 10°C',
                technology: 'Water mist + Air purification'
            }),
            features: JSON.stringify(['Temperature reduction', 'Dust control', 'Odor neutralization']),
            is_static: 1
        },
        {
            name: 'ART-2 Vehicle Purifier',
            description: 'Roof-top air purification system for urban vehicles',
            category: 'vehicle',
            price: 1800,
            image_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
            specifications: JSON.stringify({
                efficiency: '>90% PM10 reduction',
                operation: 'Stationary and moving',
                power: 'Vehicle battery'
            }),
            features: JSON.stringify(['Mobile operation', 'Energy efficient', 'Easy installation']),
            is_static: 1
        },
        {
            name: 'NICO Emission Control',
            description: 'Advanced diesel engine emission control system',
            category: 'emission',
            price: 5200,
            image_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400',
            specifications: JSON.stringify({
                reduction: '50% particulate matter',
                compatibility: 'All diesel engines',
                operation: 'Continuous 24/7'
            }),
            features: JSON.stringify(['Emission reduction', 'Universal compatibility', 'Remote monitoring']),
            is_static: 1
        }
    ];

    sampleProducts.forEach(product => {
        db.get('SELECT * FROM products WHERE name = ?', [product.name], (err, row) => {
            if (!row) {
                db.run(`INSERT INTO products (name, description, category, price, image_url, specifications, features, is_static) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [product.name, product.description, product.category, product.price, 
                     product.image_url, product.specifications, product.features, product.is_static],
                    function(err) {
                        if (!err) {
                            console.log(`✅ Sample product added: ${product.name}`);
                        }
                    }
                );
            }
        });
    });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Email sending function
async function sendFormSubmissionEmail(formData, req) {
    try {
        let emailContent = generateEmailContent(formData);
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@cleansolutions.com',
            to: RECIPIENT_EMAIL,
            subject: `[Clean Air Solutions] ${formData.formType.toUpperCase()} Form - ${formData.name || 'New Submission'}`,
            html: emailContent
        };

        await emailTransporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully to:', RECIPIENT_EMAIL);
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return false;
    }
}

function generateEmailContent(formData) {
    const formType = formData.formType.toUpperCase();
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    let content = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 30px 20px; 
                text-align: center;
            }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .content { 
                background: #ffffff; 
                padding: 30px; 
                border: 1px solid #e0e0e0;
            }
            .field { 
                margin-bottom: 20px; 
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            .label { 
                font-weight: bold; 
                color: #555; 
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
            }
            .value { 
                color: #333; 
                margin-top: 5px;
                font-size: 14px;
            }
            .footer { 
                background: #f8f9fa;
                padding: 20px; 
                text-align: center;
                font-size: 12px; 
                color: #666; 
                border-top: 3px solid #667eea;
            }
            .badge {
                display: inline-block;
                padding: 5px 10px;
                background: #667eea;
                color: white;
                border-radius: 3px;
                font-size: 12px;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌿 Clean Air Solutions</h1>
                <p>${formType} Form Submission</p>
            </div>
            <div class="content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span class="badge">New ${formType} Form</span>
                </div>`;

    // Contact Form
    if (formData.formType === 'contact') {
        content += `
                <div class="field">
                    <div class="label">Name</div>
                    <div class="value">${formData.name}</div>
                </div>`;
        
        if (formData.company) {
            content += `
                <div class="field">
                    <div class="label">Company</div>
                    <div class="value">${formData.company}</div>
                </div>`;
        }
        
        content += `
                <div class="field">
                    <div class="label">Email Address</div>
                    <div class="value"><a href="mailto:${formData.email}">${formData.email}</a></div>
                </div>
                <div class="field">
                    <div class="label">Phone Number</div>
                    <div class="value">${formData.phone || 'Not provided'}</div>
                </div>`;
        
        if (formData.subject) {
            content += `
                <div class="field">
                    <div class="label">Subject</div>
                    <div class="value">${formData.subject}</div>
                </div>`;
        }
        
        content += `
                <div class="field">
                    <div class="label">Message</div>
                    <div class="value">${formData.message}</div>
                </div>`;
        
        if (formData.newsletter) {
            content += `
                <div class="field">
                    <div class="label">Newsletter Subscription</div>
                    <div class="value">${formData.newsletter}</div>
                </div>`;
        }
    }
    
    // Career Form
    else if (formData.formType === 'career') {
        content += `
                <div class="field">
                    <div class="label">Full Name</div>
                    <div class="value">${formData.fullName}</div>
                </div>
                <div class="field">
                    <div class="label">Email Address</div>
                    <div class="value"><a href="mailto:${formData.email}">${formData.email}</a></div>
                </div>
                <div class="field">
                    <div class="label">Mobile Number</div>
                    <div class="value">${formData.mobile}</div>
                </div>
                <div class="field">
                    <div class="label">Location</div>
                    <div class="value">${formData.address || ''}<br>${formData.state}, ${formData.country} - ${formData.pincode}</div>
                </div>
                <div class="field">
                    <div class="label">Education</div>
                    <div class="value">${formData.education}</div>
                </div>
                <div class="field">
                    <div class="label">Age</div>
                    <div class="value">${formData.age}</div>
                </div>
                <div class="field">
                    <div class="label">Current Company</div>
                    <div class="value">${formData.currentCompany}</div>
                </div>
                <div class="field">
                    <div class="label">Company Product/Service</div>
                    <div class="value">${formData.companyProduct}</div>
                </div>
                <div class="field">
                    <div class="label">Experience Details</div>
                    <div class="value">
                        Total Experience: ${formData.totalExperience}<br>
                        Current Tenure: ${formData.currentTenure}<br>
                        Highest Tenure: ${formData.highestTenure}
                    </div>
                </div>
                <div class="field">
                    <div class="label">CTC Details</div>
                    <div class="value">
                        Current CTC: ${formData.currentCTC}<br>
                        Expected CTC: ${formData.expectedCTC}
                    </div>
                </div>
                <div class="field">
                    <div class="label">Expertise</div>
                    <div class="value">${formData.expertise}</div>
                </div>
                <div class="field">
                    <div class="label">Expected Position</div>
                    <div class="value">${formData.expectedPosition}</div>
                </div>
                <div class="field">
                    <div class="label">Department</div>
                    <div class="value">${formData.department}</div>
                </div>
                <div class="field">
                    <div class="label">Reason for Job Change</div>
                    <div class="value">${formData.reasonChange}</div>
                </div>`;
        
        if (formData.remarks) {
            content += `
                <div class="field">
                    <div class="label">Additional Remarks</div>
                    <div class="value">${formData.remarks}</div>
                </div>`;
        }
    }
    
    // Vendor Form
    else if (formData.formType === 'vendor') {
        content += `
                <div class="field">
                    <div class="label">Company Name</div>
                    <div class="value">${formData.companyName}</div>
                </div>
                <div class="field">
                    <div class="label">Contact Person</div>
                    <div class="value">${formData.contactName}</div>
                </div>
                <div class="field">
                    <div class="label">Email Address</div>
                    <div class="value"><a href="mailto:${formData.email}">${formData.email}</a></div>
                </div>
                <div class="field">
                    <div class="label">Phone Number</div>
                    <div class="value">${formData.phone}</div>
                </div>
                <div class="field">
                    <div class="label">Category</div>
                    <div class="value">${formData.category}</div>
                </div>
                <div class="field">
                    <div class="label">Business Type</div>
                    <div class="value">${formData.businessType}</div>
                </div>
                <div class="field">
                    <div class="label">Message</div>
                    <div class="value">${formData.message}</div>
                </div>`;
    }
    
    // Product Inquiry
    else if (formData.formType === 'inquiry') {
        content += `
                <div class="field">
                    <div class="label">Name</div>
                    <div class="value">${formData.name}</div>
                </div>`;
        
        if (formData.company) {
            content += `
                <div class="field">
                    <div class="label">Company</div>
                    <div class="value">${formData.company}</div>
                </div>`;
        }
        
        content += `
                <div class="field">
                    <div class="label">Email Address</div>
                    <div class="value"><a href="mailto:${formData.email}">${formData.email}</a></div>
                </div>
                <div class="field">
                    <div class="label">Phone Number</div>
                    <div class="value">${formData.phone}</div>
                </div>
                <div class="field">
                    <div class="label">Product Interest</div>
                    <div class="value">${formData.product}</div>
                </div>`;
        
        if (formData.quantity) {
            content += `
                <div class="field">
                    <div class="label">Quantity</div>
                    <div class="value">${formData.quantity}</div>
                </div>`;
        }
        
        content += `
                <div class="field">
                    <div class="label">Message</div>
                    <div class="value">${formData.message}</div>
                </div>`;
    }
    
    // Newsletter
    else if (formData.formType === 'newsletter') {
        content += `
                <div class="field">
                    <div class="label">Email Address</div>
                    <div class="value"><a href="mailto:${formData.email}">${formData.email}</a></div>
                </div>`;
    }

    content += `
            </div>
            <div class="footer">
                <p><strong>Submission Time:</strong> ${timestamp} (IST)</p>
                <p><strong>Recipient:</strong> ${RECIPIENT_EMAIL}</p>
                <p style="margin-top: 15px; color: #999;">
                    This is an automated email from Clean Air Solutions website.<br>
                    Please respond to the customer at their email address.
                </p>
            </div>
        </div>
    </body>
    </html>`;

    return content;
}

// ==================== API ENDPOINTS ====================

// FORM SUBMISSION WITH EMAIL
app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;
        console.log('📝 Form submission received:', formData.formType);

        // Validate required fields
        if (!formData.email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }

        // Save to database
        const name = formData.name || formData.fullName || formData.contactName || 'Anonymous';
        const email = formData.email;
        const phone = formData.phone || formData.mobile || '';
        const company = formData.company || formData.companyName || '';
        const subject = formData.subject || formData.expectedPosition || '';
        const message = formData.message || '';
        const department = formData.department || '';

        db.run(
            `INSERT INTO form_submissions (type, name, email, phone, company, subject, message, department, form_data) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [formData.formType, name, email, phone, company, subject, message, department, JSON.stringify(formData)],
            async function(err) {
                if (err) {
                    console.error('❌ Database error:', err);
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Failed to save form data' 
                    });
                }
                
                console.log('✅ Form saved to database with ID:', this.lastID);
                
                // Send email notification (non-blocking)
                sendFormSubmissionEmail(formData, req).then(emailSent => {
                    if (emailSent) {
                        console.log('✅ Email notification sent successfully');
                    } else {
                        console.log('⚠️ Email notification failed, but form was saved');
                    }
                }).catch(error => {
                    console.log('⚠️ Email error:', error.message);
                });
                
                // Return success immediately
                res.json({ 
                    success: true, 
                    message: 'Form submitted successfully! We will contact you soon.',
                    submissionId: this.lastID
                });
            }
        );

    } catch (error) {
        console.error('❌ Form submission error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to submit form' 
        });
    }
});

// LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ? AND status = "active"', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                name: user.name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Login successful:', user.email);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});

// VERIFY TOKEN
app.get('/api/verify-token', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// GET ALL USERS
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT id, name, email, role, status, created_at, last_login FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// CREATE USER
app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password required' });
    }
    
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (row) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'viewer'],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({
                    success: true,
                    message: 'User created successfully',
                    userId: this.lastID
                });
            }
        );
    });
});

// UPDATE USER
app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, email, role, status } = req.body;
    
    db.run('UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?',
        [name, email, role, status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({
                success: true,
                message: 'User updated successfully'
            });
        }
    );
});

// DELETE USER
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    });
});

// GET ALL PRODUCTS
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products WHERE status = "active" ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        const products = rows.map(product => ({
            ...product,
            specifications: product.specifications ? JSON.parse(product.specifications) : {},
            features: product.features ? JSON.parse(product.features) : []
        }));
        
        res.json(products);
    });
});

// GET PRODUCT BY ID
app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        product.specifications = product.specifications ? JSON.parse(product.specifications) : {};
        product.features = product.features ? JSON.parse(product.features) : [];
        
        res.json(product);
    });
});

// CREATE PRODUCT
app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
    const { name, description, category, price, image_url, specifications, features } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Product name required' });
    }
    
    const specsJson = specifications ? JSON.stringify(specifications) : '{}';
    const featuresJson = features ? JSON.stringify(features) : '[]';
    
    db.run(`INSERT INTO products (name, description, category, price, image_url, specifications, features, is_static) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, description, category, price || 0, image_url, specsJson, featuresJson, 0],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({
                success: true,
                message: 'Product created successfully',
                productId: this.lastID
            });
        }
    );
});

// UPDATE PRODUCT
app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, description, category, price, image_url, specifications, features, status } = req.body;
    
    const specsJson = specifications ? JSON.stringify(specifications) : '{}';
    const featuresJson = features ? JSON.stringify(features) : '[]';
    
    db.run(`UPDATE products SET name = ?, description = ?, category = ?, price = ?, image_url = ?, 
            specifications = ?, features = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, description, category, price, image_url, specsJson, featuresJson, status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({
                success: true,
                message: 'Product updated successfully'
            });
        }
    );
});

// DELETE PRODUCT
app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM products WHERE id = ? AND is_static = 0', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.status(400).json({ error: 'Cannot delete static products' });
        }
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    });
});

// GET ALL FORM SUBMISSIONS
app.get('/api/forms', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT * FROM form_submissions ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// GET FORM SUBMISSIONS COUNT
app.get('/api/forms/count', authenticateToken, requireAdmin, (req, res) => {
    db.get('SELECT COUNT(*) as count FROM form_submissions', (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ count: row.count });
    });
});

// UPDATE FORM STATUS
app.put('/api/forms/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    db.run('UPDATE form_submissions SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({
            success: true,
            message: 'Form status updated successfully'
        });
    });
});

// DELETE FORM SUBMISSION
app.delete('/api/forms/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM form_submissions WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({
            success: true,
            message: 'Form submission deleted successfully'
        });
    });
});

// GET DASHBOARD STATS
app.get('/api/dashboard/stats', authenticateToken, requireAdmin, (req, res) => {
    const stats = {};
    
    db.get('SELECT COUNT(*) as count FROM products WHERE status = "active"', (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        stats.totalProducts = row.count;

        db.get('SELECT COUNT(*) as count FROM users WHERE status = "active"', (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            stats.totalUsers = row.count;

            db.get('SELECT COUNT(*) as count FROM form_submissions', (err, row) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                stats.totalForms = row.count;

                db.get('SELECT COUNT(*) as count FROM notifications WHERE read_status = 0', (err, row) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    stats.totalNotifications = row.count;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
    db.get('SELECT 1 as test', (err, row) => {
        const dbStatus = err ? 'disconnected' : 'connected';
        
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            service: 'Clean Air Solutions API',
            database: dbStatus,
            emailRecipient: RECIPIENT_EMAIL,
            features: [
                'Form Storage & Email Notifications',
                'Admin Panel Authentication',
                'User Management',
                'Product Management',
                'Form Submissions Dashboard'
            ]
        });
    });
});

// TEST EMAIL
app.get('/api/test-email', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const testData = {
            formType: 'contact',
            name: 'Test User',
            email: 'test@example.com',
            phone: '+91 9876543210',
            subject: 'Test Email from Clean Air Solutions',
            message: 'This is a test email to verify the email configuration is working correctly.',
            timestamp: new Date().toISOString()
        };

        const emailSent = await sendFormSubmissionEmail(testData, req);
        
        if (emailSent) {
            res.json({ 
                success: true, 
                message: `Test email sent successfully to ${RECIPIENT_EMAIL}` 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to send test email. Check server logs for details.' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 ===============================================');
    console.log('   Clean Air Solutions Server Started');
    console.log('   ===============================================');
    console.log('📍 URL: http://localhost:' + PORT);
    console.log('🔐 Admin Panel: http://localhost:' + PORT + '/admin.html');
    console.log('\n📋 Default Admin Credentials:');
    console.log('   📧 Email: admin@zylm.in');
    console.log('   🔐 Password: Admin123!');
    console.log('\n📧 Email Configuration:');
    console.log('   ✉️  All forms will be sent to: ' + RECIPIENT_EMAIL);
    console.log('   ⚙️  Configure in .env file for email notifications');
    console.log('\n📊 API Endpoints:');
    console.log('   🩺 Health: http://localhost:' + PORT + '/api/health');
    console.log('   🔑 Login: http://localhost:' + PORT + '/api/login');
    console.log('   📊 Stats: http://localhost:' + PORT + '/api/dashboard/stats');
    console.log('   📝 Submit Form: http://localhost:' + PORT + '/api/submit-form');
    console.log('   📦 Products: http://localhost:' + PORT + '/api/products');
    console.log('   👥 Users: http://localhost:' + PORT + '/api/users (Admin)');
    console.log('   📋 Forms: http://localhost:' + PORT + '/api/forms (Admin)');
    console.log('   📧 Test Email: http://localhost:' + PORT + '/api/test-email (Admin)');
    console.log('\n✅ Server is ready and listening!');
    console.log('================================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});