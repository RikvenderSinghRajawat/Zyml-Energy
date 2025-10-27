[file name]: server.js
[file content begin]
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Email transporter configuration
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'divyanshujpr027@gmail.com', // Your email
        pass: 'vkqpjljktmwwaohe'     // Your app password
    }
});

// Generate random OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Send OTP
app.post('/api/send-otp', (req, res) => {
    const { phone } = req.body;
    
    if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    otpStore.set(phone, { otp, expiresAt });

    console.log(`OTP for ${phone}: ${otp}`); // In production, send via SMS service

    res.json({ 
        success: true, 
        message: 'OTP sent successfully',
        otp: otp // Remove this in production - only for testing
    });
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
        return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
    }

    const storedData = otpStore.get(phone);
    
    if (!storedData) {
        return res.status(400).json({ success: false, error: 'OTP not found or expired' });
    }

    if (Date.now() > storedData.expiresAt) {
        otpStore.delete(phone);
        return res.status(400).json({ success: false, error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // OTP verified successfully
    otpStore.delete(phone); // Remove OTP after successful verification
    
    res.json({ success: true, message: 'OTP verified successfully' });
});

// Submit form
app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;
        const recipientEmail = 'divyanshujpr027@gmail.com';

        // Create email content
        const emailContent = `
            New Form Submission - ${formData.formType}
            
            Submission Details:
            ${Object.entries(formData).map(([key, value]) => `${key}: ${value}`).join('\n')}
            
            Submitted at: ${new Date().toLocaleString()}
            IP: ${req.ip}
            User Agent: ${req.get('User-Agent')}
        `;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; }
                    .details { margin: 20px 0; }
                    .field { margin: 10px 0; }
                    .label { font-weight: bold; color: #333; }
                    .value { color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>New ${formData.formType} Form Submission</h2>
                        <p>Submitted on: ${new Date().toLocaleString()}</p>
                    </div>
                    <div class="details">
                        ${Object.entries(formData).map(([key, value]) => `
                            <div class="field">
                                <span class="label">${key}:</span>
                                <span class="value">${value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send email
        const mailOptions = {
            from: 'divyanshujpr027@gmail.com',
            to: recipientEmail,
            subject: `New ${formData.formType} Form Submission`,
            text: emailContent,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);

        // Store in database (you can add your database logic here)
        console.log('Form submission stored:', formData);

        res.json({ 
            success: true, 
            message: 'Form submitted successfully',
            data: formData
        });

    } catch (error) {
        console.error('Form submission error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to submit form',
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Forms will be sent to: divyanshujpr027@gmail.com`);
});
[file content end]