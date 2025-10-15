// Authentication System - Separate File
class AuthSystem {
    constructor() {
        this.tokenKey = 'adminToken';
        this.userKey = 'adminUser';
        this.apiBase = window.location.origin + '/api';
        this.init();
    }

    init() {
        console.log('🔐 Auth system initialized');
        this.setupLoginForm();
        this.checkExistingAuth();
    }

    // Check if user is already logged in
    checkExistingAuth() {
        const token = this.getToken();
        const user = this.getUser();
        
        if (token && user) {
            console.log('✅ User already authenticated, redirecting to admin panel');
            this.redirectToAdmin();
        }
    }

    // Setup login form handler
    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            console.log('✅ Login form handler attached');
        }
    }

    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        console.log('🔐 Login attempt:', { email, password: '••••••' });
        
        this.showLoading(true);
        this.hideMessages();

        try {
            const result = await this.authenticate(email, password);
            
            if (result.success) {
                this.showSuccess('Login successful! Redirecting...');
                this.saveAuthData(result.token, result.user);
                
                // Redirect after short delay
                setTimeout(() => {
                    this.redirectToAdmin();
                }, 1500);
                
            } else {
                this.showError(result.error || 'Login failed');
            }
            
        } catch (error) {
            console.error('💥 Login error:', error);
            this.showError('Network error. Please check if server is running.');
        } finally {
            this.showLoading(false);
        }
    }

    // Authenticate with server
    async authenticate(email, password) {
        const response = await fetch(`${this.apiBase}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            return {
                success: true,
                token: data.token,
                user: data.user
            };
        } else {
            return {
                success: false,
                error: data.error || 'Authentication failed'
            };
        }
    }

    // Save authentication data
    saveAuthData(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        console.log('✅ Auth data saved to localStorage');
    }

    // Get stored token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Get stored user data
    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = this.getToken();
        const user = this.getUser();
        return !!(token && user);
    }

    // Logout user
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        console.log('✅ User logged out');
        this.redirectToLogin();
    }

    // Redirect to admin panel
    redirectToAdmin() {
        window.location.href = 'admin.html';
    }

    // Redirect to login page
    redirectToLogin() {
        window.location.href = 'login.html';
    }

    // Show loading state
    showLoading(show) {
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');
        const loginBtn = document.getElementById('loginBtn');
        
        if (show) {
            btnText.style.display = 'none';
            btnSpinner.style.display = 'block';
            loginBtn.disabled = true;
        } else {
            btnText.style.display = 'block';
            btnSpinner.style.display = 'none';
            loginBtn.disabled = false;
        }
    }

    // Show error message
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideMessages();
        }, 5000);
    }

    // Show success message
    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }

    // Hide all messages
    hideMessages() {
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
    }

    // Verify token with server (optional)
    async verifyToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${this.apiBase}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// Initialize auth system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.authSystem = new AuthSystem();
});

// Global logout function
function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    } else {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = 'login.html';
    }
}