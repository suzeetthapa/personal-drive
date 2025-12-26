// GitHub Drive Manager - Auth System

class GitHubDriveAuth {
    constructor() {
        this.token = null;
        this.username = null;
        this.repoName = 'my-personal-drive';
        this.repoOwner = null;
        
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
    
    saveToken(token) {
       
        this.validateToken(token)
            .then(username => {
                this.token = token;
                this.username = username;
                this.repoOwner = username;
                
                localStorage.setItem('github_drive_token', token);
                localStorage.setItem('github_username', username);
                
                this.showApp();
            })
            .catch(error => {
                alert('Invalid token: ' + error.message);
            });
    }
    
    async validateToken(token) {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token or network error');
        }
        
        const userData = await response.json();
        return userData.login;
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
            this.logout();
        });
    }
    
  
    async apiRequest(endpoint, method = 'GET', data = null) {
        const url = `https://api.github.com${endpoint}`;
        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        const options = {
            method,
            headers
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        return response.json();
    }
    
    
    async getFileContent(path) {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        return this.apiRequest(endpoint);
    }
    
    async createFile(path, content, message = 'Add file') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        const data = {
            message,
            content: btoa(unescape(encodeURIComponent(content)))
        };
        return this.apiRequest(endpoint, 'PUT', data);
    }
    
    async updateFile(path, sha, content, message = 'Update file') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        const data = {
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            sha
        };
        return this.apiRequest(endpoint, 'PUT', data);
    }
    
    async deleteFile(path, sha, message = 'Delete file') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        const data = {
            message,
            sha
        };
        return this.apiRequest(endpoint, 'DELETE', data);
    }
    
    async listFiles(path = '') {
        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        try {
            return await this.apiRequest(endpoint);
        } catch (error) {
          
            return [];
        }
    }
    
    async createDirectory(path) {
       
        const filePath = path ? `${path}/.gitkeep` : '.gitkeep';
        return this.createFile(filePath, '', 'Create directory');
    }
    
    async uploadLargeFile(path, file) {
      
        if (file.size > 25 * 1024 * 1024) {
            throw new Error('File too large. Max size is 25MB for GitHub API.');
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const content = reader.result.split(',')[1]; 
                try {
                    const result = await this.createFile(path, content, `Upload ${file.name}`);
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
        const content = atob(fileData.content);
        return {
            content,
            name: fileData.name,
            size: fileData.size,
            download_url: fileData.download_url
        };
    }
}


const auth = new GitHubDriveAuth();
window.auth = auth;