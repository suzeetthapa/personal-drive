// GitHub Drive Manager - Authentication System

class GitHubDriveAuth {
    constructor() {
        this.token = null;
        this.username = null;
        this.repoName = 'my-personal-drive';
        this.repoOwner = null;
        this.baseURL = 'https://api.github.com';
        this.cache = new Map();
        
        this.init();
    }
    
    init() {
        this.loadToken();
        this.setupEventListeners();
    }
    
    loadToken() {
        this.token = localStorage.getItem('github_drive_token');
        this.username = localStorage.getItem('github_username');
        
        if (this.token && this.username) {
            this.repoOwner = this.username;
            this.showApp();
        } else {
            this.showAuth();
        }
    }
    
    async saveToken(token) {
        this.showLoading('Validating token...');
        
        try {
            const username = await this.validateToken(token);
            
            this.token = token;
            this.username = username;
            this.repoOwner = username;
            
            localStorage.setItem('github_drive_token', token);
            localStorage.setItem('github_username', username);
            
            await this.ensureRepositoryExists();
            
            this.showApp();
            this.showToast('Login successful!', 'success');
        } catch (error) {
            console.error('Token validation failed:', error);
            this.showToast('Invalid token. Please check and try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async validateToken(token) {
        const cacheKey = 'validate_token';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const response = await fetch(`${this.baseURL}/user`, {
            headers: this.getHeaders(token)
        });
        
        if (!response.ok) {
            throw new Error(`Invalid token (${response.status})`);
        }
        
        const userData = await response.json();
        this.cache.set(cacheKey, userData.login);
        return userData.login;
    }
    
    async ensureRepositoryExists() {
        try {
            await this.apiRequest(`/repos/${this.repoOwner}/${this.repoName}`);
        } catch (error) {
            if (error.message.includes('404')) {
                console.log('Creating repository...');
                await this.createRepository();
            } else {
                throw error;
            }
        }
    }
    
    async createRepository() {
        const response = await fetch(`${this.baseURL}/user/repos`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                name: this.repoName,
                description: 'Personal Drive Storage',
                private: true,
                auto_init: true
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to create repository: ${error.message}`);
        }
        
        return await response.json();
    }
    
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('github_drive_token');
            localStorage.removeItem('github_username');
            this.token = null;
            this.username = null;
            this.cache.clear();
            this.showAuth();
            this.showToast('Logged out successfully', 'info');
        }
    }
    
    showAuth() {
        document.getElementById('authScreen').style.display = 'block';
        document.getElementById('appScreen').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'none';
    }
    
    showApp() {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        document.getElementById('loadingScreen').style.display = 'none';
        
        if (this.username) {
            document.getElementById('username').textContent = this.username;
        }
        
        if (window.driveManager) {
            window.driveManager.init();
        }
    }
    
    setupEventListeners() {
        document.getElementById('saveTokenBtn')?.addEventListener('click', () => {
            const token = document.getElementById('githubToken').value.trim();
            if (token) {
                this.saveToken(token);
            } else {
                this.showToast('Please enter your GitHub token', 'error');
            }
        });
        
        document.getElementById('showToken')?.addEventListener('click', (e) => {
            const input = document.getElementById('githubToken');
            input.type = input.type === 'password' ? 'text' : 'password';
            e.target.querySelector('i').classList.toggle('fa-eye');
            e.target.querySelector('i').classList.toggle('fa-eye-slash');
        });
        
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
    }
    
    getHeaders(token = null) {
        return {
            'Authorization': `Bearer ${token || this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Personal-Drive-App'
        };
    }
    
    async apiRequest(endpoint, method = 'GET', data = null, useCache = false) {
        const cacheKey = `${method}_${endpoint}_${JSON.stringify(data)}`;
        
        if (useCache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const url = `${this.baseURL}${endpoint}`;
        const headers = this.getHeaders();
        
        if (method !== 'GET' && data) {
            headers['Content-Type'] = 'application/json';
        }
        
        const options = {
            method,
            headers
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`GitHub API error (${response.status}): ${error.message || 'Unknown error'}`);
        }
        
        if (response.status === 204) {
            return { success: true };
        }
        
        const result = await response.json();
        
        if (useCache && method === 'GET') {
            this.cache.set(cacheKey, result);
        }
        
        return result;
    }
    
    // File Operations
    async listFiles(path = '') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        try {
            const files = await this.apiRequest(endpoint, 'GET', null, true);
            return Array.isArray(files) ? files : [];
        } catch (error) {
            if (error.message.includes('404')) {
                return [];
            }
            throw error;
        }
    }
    
    async uploadFile(file, path = '') {
        const filePath = path ? `${path}/${file.name}` : file.name;
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64Content = reader.result.split(',')[1];
                    const result = await this.createFile(filePath, base64Content, `Upload ${file.name}`);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async createFile(path, content, message = 'Add file') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        const data = {
            message,
            content: content
        };
        return this.apiRequest(endpoint, 'PUT', data);
    }
    
    async deleteFile(path, sha, message = 'Delete file') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        const data = {
            message,
            sha
        };
        
        // Clear cache for this path
        const cacheKey = `GET_/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        this.cache.delete(cacheKey);
        
        return this.apiRequest(endpoint, 'DELETE', data);
    }
    
    async downloadFile(file) {
        try {
            // Get file info
            const fileInfo = await this.apiRequest(`/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(file.path)}`);
            
            // Fetch the actual file content
            const response = await fetch(fileInfo.download_url, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileInfo.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            return { success: true, name: fileInfo.name };
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }
    
    async getStorageStats() {
        try {
            const repo = await this.apiRequest(`/repos/${this.repoOwner}/${this.repoName}`, 'GET', null, true);
            return {
                size: repo.size * 1024, // Convert KB to bytes
                updated: repo.updated_at
            };
        } catch (error) {
            console.error('Storage stats error:', error);
            return { size: 0, updated: new Date() };
        }
    }
    
    // Utility methods
    showLoading(text = 'Loading...') {
        const loading = document.getElementById('loadingScreen');
        const textEl = document.querySelector('.loading-content p');
        if (loading && textEl) {
            textEl.textContent = text;
            loading.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('loadingScreen');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = `toast ${type}`;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }
}

// Initialize auth system
const auth = new GitHubDriveAuth();
window.auth = auth;