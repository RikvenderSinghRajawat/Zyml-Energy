// Authentication module for admin panel
// Production-ready version

class Auth {
    constructor() {
        this.apiUrl = '/api/login';
        this.tokenKey = 'zylm_auth_token';
        this.userKey = 'zylm_auth_user';
        
        // Check if user is already logged in
        this.checkAuth();
        
        // Set up login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            this.setupLoginForm(loginForm);
        }
        
        // Set up logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }
    
    checkAuth() {
        const token = localStorage.getItem(this.tokenKey);
        const user = JSON.parse(localStorage.getItem(this.userKey) || '{}');
        
        if (token && user.email) {
            // User is authenticated
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'admin.html';
            }
            
            // Update UI with user info
            this.updateUserInfo(user);
        } else if (!window.location.pathname.includes('login.html') && 
                  window.location.pathname.includes('admin')) {
            // Not authenticated and trying to access admin page
            window.location.href = 'login.html';
        }
    }
    
    setupLoginForm(form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const email = form.querySelector('input[name="email"]').value;
            const password = form.querySelector('input[name="password"]').value;
            
            if (!email || !password) {
                this.showLoginError('Email and password are required');
                return;
            }
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            
            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const result = await response.json();
                
                if (result.success && result.token) {
                    // Save auth data
                    this.saveAuthData(result.token, result.user);
                    
                    // Redirect to admin panel
                    window.location.href = 'admin.html';
                } else {
                    this.showLoginError(result.message || 'Invalid credentials');
                }
            } catch (error) {
                this.showLoginError('Network error. Please try again.');
            } finally {
                // Restore button state
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
    
    saveAuthData(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    
    updateUserInfo(user) {
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        const userRoleElements = document.querySelectorAll('.user-role');
        
        userNameElements.forEach(el => {
            el.textContent = user.name || 'Admin User';
        });
        
        userEmailElements.forEach(el => {
            el.textContent = user.email || '';
        });
        
        userRoleElements.forEach(el => {
            el.textContent = user.role || 'admin';
        });
    }
    
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        
        window.location.href = 'login.html';
    }
    
    showLoginError(message) {
        const errorElement = document.getElementById('loginError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            alert(message);
        }
    }
    
    // Get authentication token for API calls
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }
    
    // Get current user
    getUser() {
        return JSON.parse(localStorage.getItem(this.userKey) || '{}');
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
});