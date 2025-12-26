// GitHub Drive Manager - Fixed Auth System for 2024

class GitHubDriveAuth {
    constructor() {
        this.token = null;
        this.username = null;
        this.repoName = 'my-personal-drive';
        this.repoOwner = null;
        this.baseURL = 'https://api.github.com';
        
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
            // First, create or verify repository exists
            const username = await this.validateToken(token);
            
            this.token = token;
            this.username = username;
            this.repoOwner = username;
            
            localStorage.setItem('github_drive_token', token);
            localStorage.setItem('github_username', username);
            
            // Ensure repository exists
            await this.ensureRepositoryExists();
            
            this.showApp();
        } catch (error) {
            alert('Error: ' + error.message);
            console.error('Token validation failed:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    async validateToken(token) {
        const response = await fetch(`${this.baseURL}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Personal-Drive-App'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error (${response.status}): ${errorText}`);
        }
        
        const userData = await response.json();
        return userData.login;
    }
    
    async ensureRepositoryExists() {
        try {
            // Try to get repository info
            await this.apiRequest(`/repos/${this.repoOwner}/${this.repoName}`);
        } catch (error) {
            // Repository doesn't exist, create it
            console.log('Repository not found, creating...');
            await this.createRepository();
        }
    }
    
    async createRepository() {
        const response = await fetch(`${this.baseURL}/user/repos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Personal-Drive-App'
            },
            body: JSON.stringify({
                name: this.repoName,
                description: 'Personal Drive Storage',
                private: true,
                auto_init: true, // Initialize with README
                is_template: false
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create repository: ${errorText}`);
        }
        
        return await response.json();
    }
    
    logout() {
        localStorage.removeItem('github_drive_token');
        localStorage.removeItem('github_username');
        this.token = null;
        this.username = null;
        this.showAuth();
    }
    
    showAuth() {
        document.getElementById('authScreen').style.display = 'block';
        document.getElementById('appScreen').style.display = 'none';
    }
    
    showApp() {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        document.getElementById('username').textContent = this.username;
        
        if (window.driveManager) {
            window.driveManager.init();
        }
    }
    
    setupEventListeners() {
        document.getElementById('saveTokenBtn').addEventListener('click', () => {
            const token = document.getElementById('githubToken').value.trim();
            if (token) {
                this.saveToken(token);
            } else {
                alert('Please enter your GitHub token');
            }
        });
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                this.logout();
            }
        });
    }
    
    // GitHub API Helper Methods
    async apiRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Personal-Drive-App'
        };
        
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
            const errorText = await response.text();
            throw new Error(`GitHub API error (${response.status}): ${errorText}`);
        }
        
        // For DELETE requests that return no content
        if (response.status === 204) {
            return { success: true };
        }
        
        return await response.json();
    }
    
    // File Operations
    async getFileContent(path) {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        return this.apiRequest(endpoint);
    }
    
    async createFile(path, content, message = 'Add file') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        const data = {
            message,
            content: btoa(content)
        };
        return this.apiRequest(endpoint, 'PUT', data);
    }
    
    async updateFile(path, sha, content, message = 'Update file') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        const data = {
            message,
            content: btoa(content),
            sha
        };
        return this.apiRequest(endpoint, 'PUT', data);
    }
    
    async deleteFile(path, sha, message = 'Delete file') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        const data = {
            message,
            sha
        };
        return this.apiRequest(endpoint, 'DELETE', data);
    }
    
    async listFiles(path = '') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${encodeURIComponent(path)}`;
        try {
            const response = await this.apiRequest(endpoint);
            // Filter out .gitkeep files
            return Array.isArray(response) ? response.filter(file => file.name !== '.gitkeep') : [];
        } catch (error) {
            // If directory doesn't exist, return empty array
            if (error.message.includes('404')) {
                return [];
            }
            throw error;
        }
    }
    
    async createDirectory(path) {
        // Create README.md file in directory instead of .gitkeep
        const filePath = path ? `${path}/README.md` : 'README.md';
        const content = `# ${path.split('/').pop() || 'Home'}\n\nThis folder was created by Personal Drive.`;
        return this.createFile(filePath, content, 'Create directory');
    }
    
    async uploadFile(path, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    // Convert to base64
                    const base64Content = reader.result.split(',')[1];
                    const result = await this.createFile(path, base64Content, `Upload ${file.name}`);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async downloadFile(path) {
        const fileData = await this.getFileContent(path);
        
        // For binary files, we need to fetch from download_url
        if (fileData.download_url) {
            const response = await fetch(fileData.download_url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'User-Agent': 'Personal-Drive-App'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            
            const blob = await response.blob();
            return {
                blob,
                name: fileData.name,
                size: fileData.size,
                download_url: fileData.download_url
            };
        } else {
            // For text files, decode from content
            const content = atob(fileData.content);
            const blob = new Blob([content], { type: 'text/plain' });
            return {
                blob,
                name: fileData.name,
                size: fileData.size,
                download_url: null
            };
        }
    }
    
    showLoading(text = 'Loading...') {
        const loadingEl = document.getElementById('loadingOverlay');
        const textEl = document.getElementById('loadingText');
        if (loadingEl && textEl) {
            textEl.textContent = text;
            loadingEl.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loadingEl = document.getElementById('loadingOverlay');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }
}

// Initialize auth system
const auth = new GitHubDriveAuth();
window.auth = auth;