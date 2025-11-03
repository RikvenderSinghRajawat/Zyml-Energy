// [file name]: form-handler.js
// [file content begin]
/**
 * Form Handler for Zylm Energy
 * Handles all form submissions with OTP verification and sends to divyanshujpr027@gmail.com
 */

class FormHandler {
    constructor() {
        this.apiUrl = window.location.origin + '/api/submit-form';
        this.otpApiUrl = window.location.origin + '/api/send-otp';
        this.verifyOtpApiUrl = window.location.origin + '/api/verify-otp';
        this.recipientEmail = 'divyanshujpr027@gmail.com';
        this.otpTimers = new Map();
        this.otpVerified = new Map();
        // DLT Service configuration - always enabled as primary OTP method
        this.dltEnabled = true;
        this.init();
    }

    async init() {
        // Initialize form handlers
        try {
            const response = await fetch(window.location.origin + '/api/status');
            const result = await response.json();
            console.log('✅ Backend connection:', result.status);
            console.log('📱 OTP Features:', result.features.includes('OTP Verification System') ? 'Enabled' : 'Disabled');
        } catch (error) {
            console.warn('⚠️ Backend not connected:', error.message);
        }
    }

    setupAllForms() {
        console.log('🔧 Setting up all forms with OTP verification...');
        
        // Contact Form - uses contactPhone ID
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            this.addOTPFields(contactForm, 'contactPhone');
            contactForm.addEventListener('submit', (e) => this.handleContactFormWithOTP(e));
            console.log('✅ Contact form handler with OTP attached');
        }

        // Career Form - uses mobile ID
        const careerForm = document.getElementById('careerForm');
        if (careerForm) {
            this.addOTPFields(careerForm, 'mobile');
            careerForm.addEventListener('submit', (e) => this.handleCareerFormWithOTP(e));
            console.log('✅ Career form handler with OTP attached');
        }

        // Vendor Form - uses vendorPhone ID
        const vendorForm = document.getElementById('vendorForm');
        if (vendorForm) {
            this.addOTPFields(vendorForm, 'vendorPhone');
            vendorForm.addEventListener('submit', (e) => this.handleVendorFormWithOTP(e));
            console.log('✅ Vendor form handler with OTP attached');
        }

        // Product Inquiry Form - check for correct form ID
        const inquiryForm = document.getElementById('productInquiryForm') || document.getElementById('inquiryForm');
        if (inquiryForm) {
            // Find the phone field and use its ID
            const phoneField = inquiryForm.querySelector('input[name="phone"], input[name="mobile"]');
            if (phoneField) {
                const phoneFieldId = phoneField.id || 'inquiryPhone';
                if (!phoneField.id) phoneField.id = phoneFieldId;
                this.addOTPFields(inquiryForm, phoneFieldId);
                inquiryForm.addEventListener('submit', (e) => this.handleInquiryFormWithOTP(e));
                console.log('✅ Product inquiry form handler with OTP attached');
            }
        }

        // Legal Form - uses legalMobile ID
        const legalForm = document.getElementById('legalForm');
        if (legalForm) {
            this.addOTPFields(legalForm, 'legalMobile');
            legalForm.addEventListener('submit', (e) => this.handleLegalFormWithOTP(e));
            console.log('✅ Legal form handler with OTP attached');
        }

        // Sales Inquiry Form (Products page) - mobile field without ID
        const salesForm = document.getElementById('salesInquiryForm');
        if (salesForm) {
            // Find the mobile field in this form and assign ID
            const mobileField = salesForm.querySelector('input[name="mobile"]');
            if (mobileField) {
                if (!mobileField.id) {
                    mobileField.id = 'salesMobile';
                }
                this.addOTPFields(salesForm, 'salesMobile');
                salesForm.addEventListener('submit', (e) => this.handleSalesFormWithOTP(e));
                console.log('✅ Sales inquiry form handler with OTP attached');
            }
        }

        // Newsletter Forms - Now with OTP if they have phone fields
        const newsletterForms = document.querySelectorAll('.newsletter-form, form[id*="newsletter"], form[class*="newsletter"]');
        newsletterForms.forEach((form, index) => {
            // Check if this newsletter form has a phone field
            const phoneField = form.querySelector('input[name="phone"]') || 
                              form.querySelector('input[name="mobile"]') || 
                              form.querySelector('input[name="contactPhone"]');
            
            if (phoneField) {
                if (!phoneField.id) {
                    phoneField.id = 'newsletter_phone_' + index;
                }
                this.addOTPFields(form, phoneField.id);
                console.log(`✅ Newsletter form ${index + 1} with OTP attached`);
            }
            
            form.addEventListener('submit', (e) => this.handleNewsletterForm(e));
        });
        if (newsletterForms.length > 0) {
            console.log(`✅ ${newsletterForms.length} Newsletter form handlers attached`);
        }

        // Generic form handler for any remaining forms with phone fields
        this.setupGenericForms();
        
        console.log('✅ All forms setup completed');
    }

    addOTPFields(form, phoneFieldId) {
        console.log(`🔧 Adding OTP fields for phone field: ${phoneFieldId}`);
        
        // Check if OTP fields already exist
        if (form.querySelector('.otp-section')) {
            console.log(`⚠️ OTP section already exists for ${phoneFieldId}`);
            return;
        }

        const phoneField = form.querySelector(`#${phoneFieldId}`);
        if (!phoneField) {
            console.error(`❌ Phone field not found: ${phoneFieldId}`);
            console.log('Available fields in form:', Array.from(form.querySelectorAll('input')).map(input => `${input.name}#${input.id}`));
            return;
        }

        console.log(`✅ Found phone field: ${phoneFieldId}`);

        // Create OTP section
        const otpSection = document.createElement('div');
        otpSection.className = 'otp-section';
        otpSection.innerHTML = `
            <div class="form-group">
                <label for="${phoneFieldId}_otp">OTP Verification <span class="text-danger">*</span></label>
                <div class="otp-input-group">
                    <input type="text" id="${phoneFieldId}_otp" name="otp" class="form-control otp-input" 
                           placeholder="Enter 6-digit OTP" maxlength="6" pattern="[0-9]{6}" disabled required>
                    <button type="button" class="btn btn-secondary send-otp-btn" 
                            onclick="formHandler.sendOTP('${phoneFieldId}')">
                        Send OTP
                    </button>
                    <button type="button" class="btn btn-primary verify-otp-btn" 
                            onclick="formHandler.triggerVerify('${phoneFieldId}')" disabled>
                        Verify OTP
                    </button>
                </div>
                <small class="otp-timer" id="${phoneFieldId}_timer" style="display: none;">
                    OTP valid for: <span id="${phoneFieldId}_countdown">300</span> seconds
                </small>
                <div class="dlt-info">
                    <small class="otp-hint">
                        We'll send a verification code to your phone number via DLT service
                    </small>
                    <a href="https://www.trai.gov.in/dlt-information" target="_blank" class="dlt-link" title="Learn about DLT Service">
                        <i class="fa fa-info-circle"></i> About DLT
                    </a>
                </div>
                <div class="otp-status" id="${phoneFieldId}_status"></div>
            </div>
        `;

        // Insert OTP section after phone field
        const phoneFormGroup = phoneField.closest('.form-group');
        if (phoneFormGroup) {
            phoneFormGroup.parentNode.insertBefore(otpSection, phoneFormGroup.nextSibling);
            console.log(`✅ OTP section added after phone field: ${phoneFieldId}`);
        } else {
            // Fallback: insert after the phone field directly
            phoneField.parentNode.insertBefore(otpSection, phoneField.nextSibling);
            console.log(`✅ OTP section added after phone field (fallback): ${phoneFieldId}`);
        }

        // Add real-time phone validation
        phoneField.addEventListener('input', (e) => {
            this.validatePhoneNumber(e.target.value, phoneFieldId);
        });
    }

    validatePhoneNumber(phone, phoneFieldId) {
        const sendOtpBtn = document.querySelector(`#${phoneFieldId}`).closest('.form-group').nextElementSibling?.querySelector('.send-otp-btn');
        const statusElement = document.getElementById(`${phoneFieldId}_status`);
        
        const cleanPhone = phone.replace(/\D/g, '');
        const isValid = /^[6-9]\d{9}$/.test(cleanPhone);
        
        if (sendOtpBtn) {
            sendOtpBtn.disabled = !isValid || cleanPhone.length !== 10;
        }
        
        if (statusElement) {
            if (cleanPhone.length === 0) {
                statusElement.innerHTML = '';
            } else if (!isValid) {
                statusElement.innerHTML = '<span style="color: #dc3545;">Please enter a valid Indian phone number</span>';
            } else {
                statusElement.innerHTML = '<span style="color: #28a745;">Valid phone number</span>';
            }
        }
        
        return isValid;
    }

    addOtpVerificationToPhoneField(form, phoneFieldId) {
        try {
            const phoneField = document.getElementById(phoneFieldId);
            if (!phoneField) {
                return false;
            }
            
            // Make API call to send OTP
            const response = await fetch(this.otpApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phoneNumber }),
            });
            
            const data = await response.json();
            
            // Re-enable the send OTP button
            if (sendOtpBtn) {
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerHTML = 'Resend OTP';
            }
            
            if (data.success) {
                // Start the timer
                this.startOtpTimer(phoneFieldId);
                
                // Show success message
                this.showMessage('OTP sent successfully', 'success', phoneFieldId);
                
                // Enable the verify button
                const verifyOtpBtn = document.querySelector(`[data-verify-phone="${phoneFieldId}"]`);
                if (verifyOtpBtn) {
                    verifyOtpBtn.disabled = false;
                }
                
                return true;
            } else {
                this.showMessage(data.message || 'Failed to send OTP', 'error', phoneFieldId);
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    initDLTService() {
        try {
            // DLT service is always enabled as it's the primary OTP method
            console.log('✅ DLT Service enabled for SMS OTP');
            
            // DLT configuration is handled server-side
            this.dltEnabled = true;
        } catch (err) {
            console.warn('⚠️ DLT service initialization error:', err.message);
            this.dltEnabled = false;
        }
    }

    async sendOTP(phoneFieldId) {
        try {
            const phoneField = document.getElementById(phoneFieldId);
            const phoneNumber = phoneField.value.trim();
            
            if (!this.validatePhoneNumber(phoneNumber)) {
                this.showMessage('Please enter a valid 10-digit phone number', 'error', phoneFieldId);
                return false;
            }
            
            // Disable the send OTP button and show loading
            const sendOtpBtn = document.querySelector(`[data-phone-field="${phoneFieldId}"]`);
            if (sendOtpBtn) {
                sendOtpBtn.disabled = true;
                sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            }
            
            // Make API call to send OTP
            const response = await fetch(this.otpApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phoneNumber }),
            });
            
            const data = await response.json();
            
            // Re-enable the send OTP button
            if (sendOtpBtn) {
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerHTML = 'Resend OTP';
            }
            
            if (data.success) {
                // Start the timer
                this.startOtpTimer(phoneFieldId);
                
                // Show success message
                this.showMessage('OTP sent successfully', 'success', phoneFieldId);
                
                // Enable the verify button
                const verifyOtpBtn = document.querySelector(`[data-verify-phone="${phoneFieldId}"]`);
                if (verifyOtpBtn) {
                    verifyOtpBtn.disabled = false;
                }
                
                return true;
            } else {
                this.showMessage(data.message || 'Failed to send OTP', 'error', phoneFieldId);
                return false;
            }
        } catch (error) {
            this.showMessage('An error occurred while sending OTP', 'error', phoneFieldId);
            return false;
        }
    }

    async verifyOTP(phoneFieldId) {
        try {
            const phoneField = document.getElementById(phoneFieldId);
            const phoneNumber = phoneField.value.trim();
            
            const otpField = document.querySelector(`input[data-otp-for="${phoneFieldId}"]`);
            if (!otpField) {
                this.showMessage('OTP field not found', 'error', phoneFieldId);
                return false;
            }
            
            const otp = otpField.value.trim();
            if (!otp || otp.length !== 6) {
                this.showMessage('Please enter a valid 6-digit OTP', 'error', phoneFieldId);
                return false;
            }
            
            // Disable the verify button and show loading
            const verifyOtpBtn = document.querySelector(`[data-verify-phone="${phoneFieldId}"]`);
            if (verifyOtpBtn) {
                verifyOtpBtn.disabled = true;
                verifyOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            }
            
            // Make API call to verify OTP
            const response = await fetch(this.verifyOtpApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phoneNumber, otp }),
            });
            
            const data = await response.json();
            
            // Re-enable the verify button
            if (verifyOtpBtn) {
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.innerHTML = 'Verify OTP';
            }
            
            if (data.success) {
                // Mark as verified
                this.otpVerified.set(phoneFieldId, true);
                
                // Clear the timer
                this.clearOtpTimer(phoneFieldId);
                
                // Show success message
                this.showMessage('OTP verified successfully', 'success', phoneFieldId);
                
                // Update UI to show verified
                const otpSection = document.querySelector(`.otp-section[data-for="${phoneFieldId}"]`);
                if (otpSection) {
                    otpSection.classList.add('verified');
                    
                    // Update the status text
                    const statusText = otpSection.querySelector('.otp-status');
                    if (statusText) {
                        statusText.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
                        statusText.classList.add('text-success');
                    }
                    
                    // Disable the OTP field and buttons
                    if (otpField) otpField.disabled = true;
                    if (verifyOtpBtn) verifyOtpBtn.disabled = true;
                    
                    const sendOtpBtn = document.querySelector(`[data-phone-field="${phoneFieldId}"]`);
                    if (sendOtpBtn) sendOtpBtn.disabled = true;
                }
                
                return true;
            } else {
                this.showMessage(data.message || 'Invalid OTP', 'error', phoneFieldId);
                return false;
            }
        } catch (error) {
            this.showMessage('An error occurred while verifying OTP', 'error', phoneFieldId);
            return false;
        }
    }

    startOTPTimer(phoneFieldId, countdownElement, sendOtpBtn, statusElement) {
        let timeLeft = 300; // 5 minutes

        // Clear existing timer
        if (this.otpTimers.has(phoneFieldId)) {
            clearInterval(this.otpTimers.get(phoneFieldId));
        }

        const timer = setInterval(() => {
            timeLeft--;
            
            if (countdownElement) {
                countdownElement.textContent = timeLeft;
            }

            if (timeLeft <= 0) {
                // OTP expired
                clearInterval(timer);
                this.otpTimers.delete(phoneFieldId);
                
                if (countdownElement) {
                    countdownElement.parentElement.style.display = 'none';
                }
                
                if (sendOtpBtn) {
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerHTML = 'Send OTP';
                }
                
                if (statusElement) {
                    statusElement.innerHTML = '<span style="color: #dc3545;">OTP expired. Please request a new one.</span>';
                }
                
                return;
            }
        }, 1000);

        this.otpTimers.set(phoneFieldId, timer);
    }

    async verifyOTP(phoneNumber, enteredOTP) {
        if (!phoneNumber || !enteredOTP) {
            return { success: false, error: 'Phone number and OTP are required' };
        }
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const cleanOTP = enteredOTP.replace(/\D/g, '');
        if (cleanOTP.length !== 6) {
            return { success: false, error: 'Please enter a 6-digit OTP' };
        }
        try {
            // Check if this OTP was already verified
            const phoneKey = `${cleanPhone}_${cleanOTP}`;
            if (this.otpVerified.has(phoneKey)) {
                return { success: true, message: 'OTP already verified' };
            }
            
            // Verify OTP using DLT service (server-side implementation)
            const response = await fetch(this.verifyOtpApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: cleanPhone, 
                    otp: cleanOTP, 
                    timestamp: new Date().toISOString(),
                    dlt: true // Flag to use DLT service
                })
            });
            const result = await response.json();
            
            // Store verified OTP to prevent multiple verifications
            if (result.success) {
                this.otpVerified.set(phoneKey, true);
                // Clear any existing timer for this phone
                if (this.otpTimers.has(cleanPhone)) {
                    clearInterval(this.otpTimers.get(cleanPhone));
                    this.otpTimers.delete(cleanPhone);
                }
            }
            
            return result;
        } catch (error) {
            console.error('❌ OTP verification error:', error);
            return { success: false, error: 'OTP verification failed. Please try again.' };
        }
    }

    // OTP-Enabled Form Handlers
    async handleContactFormWithOTP(e) {
        e.preventDefault();
        
        const phoneField = document.getElementById('contactPhone');
        const otpField = document.getElementById('contactPhone_otp');
        const phoneNumber = phoneField.value.trim();
        const enteredOTP = otpField.value.trim();

        // Verify OTP first
        const otpResult = await this.verifyOTP(phoneNumber, enteredOTP);
        if (!otpResult.success) {
            this.showNotification('OTP Error', otpResult.error, 'error');
            otpField.focus();
            return;
        }

        console.log('📧 Contact form submission started with OTP verification');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'contact',
            name: formData.get('name') || '',
            company: formData.get('company') || '',
            email: formData.get('email') || '',
            phone: phoneNumber,
            subject: formData.get('subject') || '',
            message: formData.get('message') || '',
            newsletter: formData.get('newsletter') === 'on' ? 'Yes' : 'No',
            otpVerified: true,
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    async handleCareerFormWithOTP(e) {
        e.preventDefault();
        
        const phoneField = document.getElementById('mobile');
        const otpField = document.getElementById('mobile_otp');
        const phoneNumber = phoneField.value.trim();
        const enteredOTP = otpField.value.trim();

        // Verify OTP first
        const otpResult = await this.verifyOTP(phoneNumber, enteredOTP);
        if (!otpResult.success) {
            this.showNotification('OTP Error', otpResult.error, 'error');
            otpField.focus();
            return;
        }

        console.log('💼 Career form submission started with OTP verification');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'career',
            fullName: formData.get('fullName') || '',
            mobile: phoneNumber,
            email: formData.get('email') || '',
            country: formData.get('country') || '',
            state: formData.get('state') || '',
            pincode: formData.get('pincode') || '',
            address: formData.get('address') || '',
            education: formData.get('education') || '',
            age: formData.get('age') || '',
            currentCompany: formData.get('currentCompany') || '',
            companyProduct: formData.get('companyProduct') || '',
            currentTenure: formData.get('currentTenure') || '',
            highestTenure: formData.get('highestTenure') || '',
            totalExperience: formData.get('totalExperience') || '',
            reasonChange: formData.get('reasonChange') || '',
            currentCTC: formData.get('currentCTC') || '',
            expectedCTC: formData.get('expectedCTC') || '',
            expertise: formData.get('expertise') || '',
            expectedPosition: formData.get('expectedPosition') || '',
            department: formData.get('department') || '',
            remarks: formData.get('remarks') || '',
            cvLink: formData.get('cv') || '',
            newsletter: formData.get('newsletter') === 'on' ? 'Yes' : 'No',
            otpVerified: true,
            timestamp: new Date().toISOString()
        };

        // Upload CV file if provided
        try {
            const cvInput = e.target.querySelector('#cvFile');
            const cvFile = cvInput && cvInput.files && cvInput.files[0] ? cvInput.files[0] : null;
            if (cvFile) {
                const uploadResult = await this.uploadCV(cvFile);
                if (uploadResult && uploadResult.success && uploadResult.fileUrl) {
                    data.cvFilePath = uploadResult.fileUrl;
                }
            }
        } catch (uploadErr) {
            console.warn('CV upload error:', uploadErr.message || uploadErr);
        }

        await this.submitForm(data, e.target);
    }

    async handleVendorFormWithOTP(e) {
        e.preventDefault();
        
        const phoneField = document.getElementById('phone');
        const otpField = document.getElementById('phone_otp');
        const phoneNumber = phoneField.value.trim();
        const enteredOTP = otpField.value.trim();

        // Verify OTP first
        const otpResult = await this.verifyOTP(phoneNumber, enteredOTP);
        if (!otpResult.success) {
            this.showNotification('OTP Error', otpResult.error, 'error');
            otpField.focus();
            return;
        }

        console.log('🤝 Vendor form submission started with OTP verification');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'vendor',
            companyName: formData.get('companyName') || '',
            contactName: formData.get('contactName') || '',
            email: formData.get('email') || '',
            phone: phoneNumber,
            category: formData.get('category') || '',
            businessType: formData.get('businessType') || '',
            message: formData.get('message') || '',
            otpVerified: true,
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    async handleInquiryFormWithOTP(e) {
        e.preventDefault();
        
        const phoneField = document.getElementById('phone');
        const otpField = document.getElementById('phone_otp');
        const phoneNumber = phoneField.value.trim();
        const enteredOTP = otpField.value.trim();

        // Verify OTP first
        const otpResult = await this.verifyOTP(phoneNumber, enteredOTP);
        if (!otpResult.success) {
            this.showNotification('OTP Error', otpResult.error, 'error');
            otpField.focus();
            return;
        }

        console.log('📦 Product inquiry form submission started with OTP verification');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'inquiry',
            name: formData.get('name') || '',
            company: formData.get('company') || '',
            email: formData.get('email') || '',
            phone: phoneNumber,
            product: formData.get('product') || '',
            quantity: formData.get('quantity') || '',
            message: formData.get('message') || '',
            otpVerified: true,
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    async handleNewsletterForm(e) {
        e.preventDefault();
        console.log('📰 Newsletter form submission started');
        
        const formData = new FormData(e.target);
        
        // Check if this newsletter form has a phone field
        const phoneField = e.target.querySelector('input[name="phone"]') || 
                          e.target.querySelector('input[name="mobile"]') || 
                          e.target.querySelector('input[name="contactPhone"]');
        
        // If there's a phone field, require OTP verification
        if (phoneField && phoneField.value) {
            const phoneFieldId = phoneField.id;
            const otpField = document.getElementById(`${phoneFieldId}_otp`);
            
            // If we have a phone but no OTP field, it means OTP verification wasn't set up
            if (!otpField) {
                this.showNotification('Error', 'Phone verification required. Please refresh the page.', 'error');
                return;
            }
            
            const phoneNumber = phoneField.value.trim();
            const enteredOTP = otpField.value.trim();
            
            // Verify OTP first
            const otpResult = await this.verifyOTP(phoneNumber, enteredOTP);
            if (!otpResult.success) {
                this.showNotification('OTP Error', otpResult.error, 'error');
                otpField.focus();
                return;
            }
            
            const data = {
                formType: 'newsletter',
                email: formData.get('email') || '',
                phone: phoneNumber,
                otpVerified: true,
                timestamp: new Date().toISOString()
            };
            
            await this.submitForm(data, e.target);
        } else {
            // No phone field, proceed without OTP
            const data = {
                formType: 'newsletter',
                email: formData.get('email') || '',
                timestamp: new Date().toISOString()
            };
            
            await this.submitForm(data, e.target);
        }
    }

    async handleLegalFormWithOTP(e) {
        e.preventDefault();
        
        const phoneField = document.getElementById('legalMobile');
        const otpField = document.getElementById('legalMobile_otp');
        const phoneNumber = phoneField.value.trim();
        const enteredOTP = otpField.value.trim();

        // Verify OTP first
        const otpResult = await this.verifyOTP(phoneNumber, enteredOTP);
        if (!otpResult.success) {
            this.showNotification('OTP Error', otpResult.error, 'error');
            otpField.focus();
            return;
        }

        console.log('⚖️ Legal form submission started with OTP verification');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'legal',
            name: formData.get('name') || '',
            mobile: phoneNumber,
            email: formData.get('email') || '',
            address: formData.get('address') || '',
            issue: formData.get('issue') || '',
            otpVerified: true,
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    async handleSalesFormWithOTP(e) {
        e.preventDefault();
        
        const phoneField = document.getElementById('salesMobile');
        const otpField = document.getElementById('salesMobile_otp');
        const phoneNumber = phoneField.value.trim();
        const enteredOTP = otpField.value.trim();

        // Verify OTP first
        const otpResult = await this.verifyOTP(phoneNumber, enteredOTP);
        if (!otpResult.success) {
            this.showNotification('OTP Error', otpResult.error, 'error');
            otpField.focus();
            return;
        }

        console.log('💼 Sales inquiry form submission started with OTP verification');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'sales_inquiry',
            companyName: formData.get('company_name') || '',
            gstNumber: formData.get('gst_number') || '',
            contactName: formData.get('contact_name') || '',
            addressLine1: formData.get('address_line1') || '',
            addressLine2: formData.get('address_line2') || '',
            city: formData.get('city') || '',
            state: formData.get('state') || '',
            pincode: formData.get('pincode') || '',
            landline: formData.get('landline') || '',
            mobile: phoneNumber,
            email: formData.get('email') || '',
            product: formData.get('product') || '',
            quantity: formData.get('quantity') || '',
            budget: formData.get('budget') || '',
            timeline: formData.get('timeline') || '',
            requirements: formData.get('requirements') || '',
            otpVerified: true,
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    setupGenericForms() {
        // Find any forms that might have been missed
        const allForms = document.querySelectorAll('form');
        allForms.forEach(form => {
            // Skip if already handled
            if (form.dataset.otpHandled) return;
            
            // Look for phone fields
            const phoneFields = form.querySelectorAll('input[type="tel"], input[name*="phone"], input[name*="mobile"]');
            
            if (phoneFields.length > 0) {
                phoneFields.forEach(phoneField => {
                    if (!phoneField.id) {
                        phoneField.id = 'generic_phone_' + Math.random().toString(36).substr(2, 9);
                    }
                    
                    // Add OTP fields if not already present
                    if (!form.querySelector('.otp-section')) {
                        this.addOTPFields(form, phoneField.id);
                    }
                });
                
                // Add generic form handler
                form.addEventListener('submit', (e) => this.handleGenericFormWithOTP(e));
                form.dataset.otpHandled = 'true';
                console.log('✅ Generic form handler with OTP attached:', form.id || 'unnamed form');
            } else {
                // For forms without phone fields, add a phone field and OTP verification
                this.addPhoneFieldWithOTP(form);
            }
        });
    }
    
    addPhoneFieldWithOTP(form) {
        const phoneId = 'added_phone_' + Math.random().toString(36).substr(2, 9);
        
        // Create phone field with proper styling
        const phoneGroup = document.createElement('div');
        phoneGroup.className = 'form-group';
        phoneGroup.innerHTML = `
            <label for="${phoneId}">Phone Number <span class="text-danger">*</span></label>
            <input type="tel" id="${phoneId}" name="phone" class="form-control" 
                   placeholder="Enter your phone number" required>
            <small class="form-text text-muted">Required for OTP verification</small>
        `;
        
        // Find submit button and insert phone group before it safely
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
            const parent = submitBtn.parentNode;
            parent.insertBefore(phoneGroup, submitBtn);
        } else {
            // If no submit button, add to the end
            form.appendChild(phoneGroup);
        }
        
        // Add OTP fields
        this.addOTPFields(form, phoneId);
        
        // Add submit handler
        form.addEventListener('submit', (e) => this.handleGenericFormWithOTP(e));
        form.dataset.otpHandled = 'true';
        
        console.log('✅ Added phone field and OTP verification to form:', form.id || 'unnamed form');
    }

    async handleGenericFormWithOTP(e) {
        e.preventDefault();
        
        // Find phone field in this form
        const phoneField = e.target.querySelector('input[type="tel"], input[name*="phone"], input[name*="mobile"]');
        if (!phoneField) {
            this.showNotification('Error', 'Phone field not found', 'error');
            return;
        }
        
        const phoneFieldId = phoneField.id;
        const otpField = document.getElementById(`${phoneFieldId}_otp`);
        const phoneNumber = phoneField.value.trim();
        const enteredOTP = otpField ? otpField.value.trim() : '';

        // Verify OTP if phone number is provided
        if (phoneNumber) {
            if (!otpField || !enteredOTP) {
                this.showNotification('OTP Error', 'OTP verification required for phone number', 'error');
                return;
            }
            
            const otpResult = await this.verifyOTP(phoneNumber, enteredOTP);
            if (!otpResult.success) {
                this.showNotification('OTP Error', otpResult.error, 'error');
                otpField.focus();
                return;
            }
        }

        console.log('📝 Generic form submission started with OTP verification');
        
        const formData = new FormData(e.target);
        const data = {
            formType: 'generic',
            otpVerified: !!phoneNumber,
            timestamp: new Date().toISOString()
        };
        
        // Add all form fields to data
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        await this.submitForm(data, e.target);
    }

    async submitForm(formData, formElement) {
        const submitBtn = formElement.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        
        // Show loading state
        if (submitBtn) {
            this.showLoading(submitBtn, true);
        }

        try {
            console.log('📤 Submitting form data:', formData);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    recipientEmail: this.recipientEmail,
                    source: window.location.href
                })
            });

            console.log('📥 Response status:', response.status);

            const result = await response.json();
            console.log('📥 Response data:', result);
            
            if (result.success) {
                this.showNotification(
                    'Success!', 
                    'Thank you for your submission. We will contact you soon.', 
                    'success'
                );
                
                // Reset form
                formElement.reset();
                
                // Reset department selection if exists
                this.resetDepartmentSelection();
                
                // Reset OTP fields
                this.resetOTPFields(formElement);
                
                // Track successful submission
                this.trackSubmission(formData.formType);
                
                console.log('✅ Form submitted successfully');
                
            } else {
                throw new Error(result.error || 'Submission failed');
            }

        } catch (error) {
            console.error('❌ Submission error:', error);
            
            let errorMessage = 'Failed to submit form. ';
            
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Please ensure the backend server is running on port 3000.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage += 'Network connection issue. Please check your internet connection.';
            } else {
                errorMessage += error.message;
            }
            
            errorMessage += '\n\nYou can also contact us directly at: ' + this.recipientEmail;
            
            this.showNotification('Error', errorMessage, 'error');
        } finally {
            // Reset button
            if (submitBtn) {
                this.showLoading(submitBtn, false, originalBtnText);
            }
        }
    }

    // Upload CV helper
    async uploadCV(file) {
        const maxSize = 5 * 1024 * 1024; // 5 MB
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (file.size > maxSize) {
            throw new Error('CV file is too large. Max 5 MB allowed.');
        }
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload PDF or DOC/DOCX.');
        }

        const formData = new FormData();
        formData.append('cvFile', file);

        const response = await fetch(window.location.origin + '/api/upload-cv', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload CV');
        }

        const result = await response.json();
        return result;
    }

    resetOTPFields(formElement) {
        const otpInputs = formElement.querySelectorAll('.otp-input');
        const timers = formElement.querySelectorAll('.otp-timer');
        const sendButtons = formElement.querySelectorAll('.send-otp-btn');
        const statusElements = formElement.querySelectorAll('.otp-status');

        otpInputs.forEach(input => {
            input.value = '';
            input.disabled = true;
        });

        timers.forEach(timer => {
            timer.style.display = 'none';
        });

        sendButtons.forEach(button => {
            button.disabled = false;
            button.innerHTML = 'Send OTP';
        });

        statusElements.forEach(element => {
            element.innerHTML = '';
        });

        // Clear OTP timers
        this.otpTimers.forEach((timer, phoneFieldId) => {
            clearInterval(timer);
            this.otpTimers.delete(phoneFieldId);
        });
    }

    showLoading(button, show, originalText = null) {
        if (show) {
            button.innerHTML = '<span class="loading-spinner"></span> Sending...';
            button.disabled = true;
            button.style.opacity = '0.7';
        } else {
            button.innerHTML = originalText || 'Submit';
            button.disabled = false;
            button.style.opacity = '1';
        }
    }

    initDepartmentSelection() {
        try {
            const deptOptions = document.querySelectorAll('.dept-option');
            const deptInput = document.getElementById('department');
            if (deptOptions.length && deptInput) {
                deptOptions.forEach(option => {
                    option.addEventListener('click', () => {
                        deptOptions.forEach(opt => opt.classList.remove('selected'));
                        option.classList.add('selected');
                        deptInput.value = option.getAttribute('data-value') || option.textContent || '';
                    });
                });
            }
        } catch (e) {
            console.warn('initDepartmentSelection encountered an issue but is non-critical:', e.message);
        }
    }

    resetDepartmentSelection() {
        const deptOptions = document.querySelectorAll('.dept-option');
        deptOptions.forEach(opt => opt.classList.remove('selected'));
        const departmentInput = document.getElementById('department');
        if (departmentInput) {
            departmentInput.value = '';
        }
    }

    trackSubmission(formType) {
        const submissions = JSON.parse(localStorage.getItem('form_submissions') || '[]');
        submissions.push({
            type: formType,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('form_submissions', JSON.stringify(submissions));
    }

    addOTPStyles() {
        if (!document.querySelector('#otp-styles')) {
            const styles = document.createElement('style');
            styles.id = 'otp-styles';
            styles.textContent = `
                .otp-section {
                    margin: 20px 0;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }

                .otp-input-group {
                    display: flex;
                    gap: 10px;
                    align-items: flex-start;
                }

                .otp-input {
                    flex: 1;
                    max-width: 200px;
                    font-family: monospace;
                    font-size: 18px;
                    text-align: center;
                    letter-spacing: 2px;
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s;
                    white-space: nowrap;
                }

                .btn-secondary:hover:not(:disabled) {
                    background: #545b62;
                    transform: translateY(-1px);
                }

                .btn-secondary:disabled {
                    background: #a0a0a0;
                    cursor: not-allowed;
                    transform: none;
                }

                .otp-timer {
                    display: block;
                    margin-top: 8px;
                    color: #dc3545;
                    font-weight: 500;
                }

                .otp-hint {
                    display: block;
                    margin-top: 5px;
                    color: #6c757d;
                    font-size: 12px;
                }

                .otp-status {
                    margin-top: 8px;
                    font-size: 13px;
                    min-height: 20px;
                }

                @media (max-width: 768px) {
                    .otp-input-group {
                        flex-direction: column;
                    }
                    
                    .otp-input {
                        max-width: 100%;
                    }
                    
                    .btn-secondary {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    showNotification(title, message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.custom-notification');
        existingNotifications.forEach(notif => notif.remove());
        
        const notification = document.createElement('div');
        notification.className = `custom-notification notification-${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                     type === 'error' ? 'exclamation-circle' : 
                     'info-circle';
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification-content">
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.addNotificationStyles();
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto remove after 8 seconds
        setTimeout(() => {
            this.removeNotification(notification);
        }, 8000);
    }

    addNotificationStyles() {
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .custom-notification {
                    position: fixed;
                    top: -100px;
                    right: 20px;
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    z-index: 10000;
                    max-width: 450px;
                    display: flex;
                    align-items: flex-start;
                    gap: 15px;
                    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                
                .custom-notification.show {
                    top: 20px;
                }
                
                .notification-success { 
                    border-left: 5px solid #28a745;
                }
                
                .notification-error { 
                    border-left: 5px solid #dc3545;
                }
                
                .notification-info { 
                    border-left: 5px solid #17a2b8;
                }
                
                .notification-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                }
                
                .notification-success .notification-icon {
                    color: #28a745;
                }
                
                .notification-error .notification-icon {
                    color: #dc3545;
                }
                
                .notification-info .notification-icon {
                    color: #17a2b8;
                }
                
                .notification-content { 
                    flex: 1; 
                }
                
                .notification-content strong {
                    display: block;
                    margin-bottom: 5px;
                    font-size: 16px;
                    color: #333;
                }
                
                .notification-content p {
                    margin: 0;
                    font-size: 14px;
                    color: #666;
                    line-height: 1.5;
                    white-space: pre-line;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #999;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.3s;
                    flex-shrink: 0;
                }
                
                .notification-close:hover {
                    background: #f0f0f0;
                    color: #333;
                }
                
                .loading-spinner {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 0.8s linear infinite;
                    margin-right: 8px;
                    vertical-align: middle;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @media (max-width: 768px) {
                    .custom-notification {
                        left: 10px;
                        right: 10px;
                        max-width: none;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.top = '-100px';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 400);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.formHandler = new FormHandler();
    console.log('🚀 Form handler with OTP verification initialized and ready');
    console.log('📧 All forms will send to: divyanshujpr027@gmail.com');
    console.log('📱 OTP verification required for phone numbers');
});
