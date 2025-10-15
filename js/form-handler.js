/**
 * Form Handler for Clean Air Solutions
 * Handles all form submissions and sends to divyanshujpr027@gmail.com
 */

class FormHandler {
    constructor() {
        this.apiUrl = window.location.origin + '/api/submit-form';
        this.recipientEmail = 'divyanshujpr027@gmail.com';
        this.init();
    }

    init() {
        console.log('📝 Form Handler initialized');
        console.log('📧 Forms will be sent to:', this.recipientEmail);
        
        this.setupAllForms();
        this.initDepartmentSelection();
        this.testConnection();
    }

    async testConnection() {
        try {
            const response = await fetch('/api/health');
            const result = await response.json();
            console.log('✅ Backend connection:', result.status);
        } catch (error) {
            console.warn('⚠️ Backend not connected:', error.message);
        }
    }

    setupAllForms() {
        // Contact Form
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => this.handleContactForm(e));
            console.log('✅ Contact form handler attached');
        }

        // Career Form
        const careerForm = document.getElementById('careerForm');
        if (careerForm) {
            careerForm.addEventListener('submit', (e) => this.handleCareerForm(e));
            console.log('✅ Career form handler attached');
        }

        // Vendor Form
        const vendorForm = document.getElementById('vendorForm');
        if (vendorForm) {
            vendorForm.addEventListener('submit', (e) => this.handleVendorForm(e));
            console.log('✅ Vendor form handler attached');
        }

        // Product Inquiry Form
        const inquiryForm = document.getElementById('productInquiryForm');
        if (inquiryForm) {
            inquiryForm.addEventListener('submit', (e) => this.handleInquiryForm(e));
            console.log('✅ Product inquiry form handler attached');
        }

        // Newsletter Forms
        const newsletterForms = document.querySelectorAll('.newsletter-form');
        newsletterForms.forEach(form => {
            form.addEventListener('submit', (e) => this.handleNewsletterForm(e));
        });
        if (newsletterForms.length > 0) {
            console.log('✅ Newsletter form handlers attached');
        }
    }

    initDepartmentSelection() {
        const deptOptions = document.querySelectorAll('.dept-option');
        if (deptOptions.length > 0) {
            deptOptions.forEach(option => {
                option.addEventListener('click', function() {
                    deptOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    const departmentInput = document.getElementById('department');
                    if (departmentInput) {
                        departmentInput.value = this.getAttribute('data-value');
                    }
                });
            });
            console.log('✅ Department selection initialized');
        }
    }

    async handleContactForm(e) {
        e.preventDefault();
        console.log('📧 Contact form submission started');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'contact',
            name: formData.get('name') || '',
            company: formData.get('company') || '',
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            subject: formData.get('subject') || '',
            message: formData.get('message') || '',
            newsletter: formData.get('newsletter') === 'on' ? 'Yes' : 'No',
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    async handleCareerForm(e) {
        e.preventDefault();
        console.log('💼 Career form submission started');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'career',
            fullName: formData.get('fullName') || '',
            mobile: formData.get('mobile') || '',
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
            newsletter: formData.get('newsletter') === 'on' ? 'Yes' : 'No',
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    async handleVendorForm(e) {
        e.preventDefault();
        console.log('🤝 Vendor form submission started');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'vendor',
            companyName: formData.get('companyName') || '',
            contactName: formData.get('contactName') || '',
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            category: formData.get('category') || '',
            businessType: formData.get('businessType') || '',
            message: formData.get('message') || '',
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    async handleInquiryForm(e) {
        e.preventDefault();
        console.log('📦 Product inquiry form submission started');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'inquiry',
            name: formData.get('name') || '',
            company: formData.get('company') || '',
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            product: formData.get('product') || '',
            quantity: formData.get('quantity') || '',
            message: formData.get('message') || '',
            timestamp: new Date().toISOString()
        };

        await this.submitForm(data, e.target);
    }

    async handleNewsletterForm(e) {
        e.preventDefault();
        console.log('📰 Newsletter form submission started');
        
        const formData = new FormData(e.target);
        
        const data = {
            formType: 'newsletter',
            email: formData.get('email') || '',
            timestamp: new Date().toISOString()
        };

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
                body: JSON.stringify(formData)
            });

            console.log('📥 Response status:', response.status);

            const result = await response.json();
            console.log('📥 Response data:', result);
            
            if (result.success) {
                this.showNotification(
                    'Success!', 
                    'Thank you for your submission. We will contact you soon at ' + this.recipientEmail, 
                    'success'
                );
                
                // Reset form
                formElement.reset();
                
                // Reset department selection if exists
                this.resetDepartmentSelection();
                
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

    resetDepartmentSelection() {
        const deptOptions = document.querySelectorAll('.dept-option');
        deptOptions.forEach(opt => opt.classList.remove('selected'));
        const departmentInput = document.getElementById('department');
        if (departmentInput) {
            departmentInput.value = '';
        }
    }

    trackSubmission(formType) {
        // Track form submissions in localStorage for analytics
        const submissions = JSON.parse(localStorage.getItem('form_submissions') || '[]');
        submissions.push({
            type: formType,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('form_submissions', JSON.stringify(submissions));
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
    console.log('🚀 Form handler initialized and ready');
    console.log('📧 All forms will send to: divyanshujpr027@gmail.com');
});