// GitHub Drive Manager - Main Application

class GitHubDriveManager {
    constructor() {
        this.currentPath = '';
        this.selectedFiles = new Set();
        this.files = [];
        this.viewMode = 'grid';
        this.renamingFile = null;
        
        this.init();
    }
    
    init() {
        if (!window.auth || !window.auth.token) {
            return;
        }
        
        this.setupEventListeners();
        this.loadFiles();
        this.updateStorageInfo();
    }
    
    setupEventListeners() {
      
        document.getElementById('newFolderBtn').addEventListener('click', () => {
            this.showNewFolderModal();
        });
        
        document.getElementById('createFolderBtn').addEventListener('click', () => {
            this.createFolder();
        });
        
      
        document.getElementById('fileUpload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
        
     
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setViewMode(e.target.closest('.view-btn').dataset.view);
            });
        });
        
      
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.setFilter(e.target.closest('.nav-item').dataset.filter);
            });
        });
        
       
        document.getElementById('breadcrumb').addEventListener('click', (e) => {
            if (e.target.classList.contains('breadcrumb-item')) {
                const path = e.target.dataset.path || '';
                this.navigateTo(path);
            }
        });
        
       
        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.selectAllFiles();
        });
        
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            this.deleteSelectedFiles();
        });
        
        document.getElementById('downloadSelectedBtn').addEventListener('click', () => {
            this.downloadSelectedFiles();
        });
        
        
        document.getElementById('searchBox').addEventListener('input', (e) => {
            this.searchFiles(e.target.value);
        });
        
       
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        document.getElementById('confirmRenameBtn').addEventListener('click', () => {
            this.confirmRename();
        });
        
       
        document.querySelector('.close-panel').addEventListener('click', () => {
            document.getElementById('infoPanel').classList.remove('active');
        });
    }
    
    async loadFiles(path = '') {
        this.showLoading('Loading files...');
        
        try {
            const files = await auth.listFiles(path);
            this.files = files;
            this.currentPath = path;
            this.renderFiles();
            this.updateBreadcrumb();
        } catch (error) {
            console.error('Error loading files:', error);
            alert('Error loading files: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    renderFiles() {
        const filesGrid = document.getElementById('filesGrid');
        filesGrid.innerHTML = '';
        
        if (this.files.length === 0) {
            filesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>This folder is empty</h3>
                    <p>Upload files or create folders to get started</p>
                </div>
            `;
            return;
        }
        
        this.files.forEach(file => {
            const fileItem = this.createFileElement(file);
            filesGrid.appendChild(fileItem);
        });
    }
    
    createFileElement(file) {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.dataset.name = file.name;
        div.dataset.type = file.type;
        div.dataset.path = file.path;
        div.dataset.sha = file.sha;
        
        const isFolder = file.type === 'dir';
        const icon = isFolder ? 'fas fa-folder' : this.getFileIcon(file.name);
        const size = isFolder ? '' : this.formatFileSize(file.size);
        
        div.innerHTML = `
            <div class="file-icon ${isFolder ? 'folder' : ''}">
                <i class="${icon}"></i>
            </div>
            <div class="file-name">${file.name}</div>
            <div class="file-meta">${size}</div>
            <div class="file-actions">
                <button class="action-btn btn-download" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button class="action-btn btn-rename" title="Rename">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="checkbox">
                <input type="checkbox" class="file-checkbox">
            </div>
        `;
        
 
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.file-actions') && !e.target.closest('.checkbox')) {
                if (isFolder) {
                    this.navigateTo(file.path);
                } else {
                    this.showFileInfo(file);
                }
            }
        });
        
        div.querySelector('.btn-download').addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadFile(file);
        });
        
        div.querySelector('.btn-rename').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showRenameModal(file);
        });
        
        div.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteFile(file);
        });
        
        div.querySelector('.file-checkbox').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFileSelection(file, e.target.checked);
        });
        
        return div;
    }
    
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': 'fas fa-file-pdf',
            'jpg': 'fas fa-file-image',
            'jpeg': 'fas fa-file-image',
            'png': 'fas fa-file-image',
            'gif': 'fas fa-file-image',
            'doc': 'fas fa-file-word',
            'docx': 'fas fa-file-word',
            'txt': 'fas fa-file-alt',
            'zip': 'fas fa-file-archive',
            'rar': 'fas fa-file-archive',
            'mp3': 'fas fa-file-audio',
            'mp4': 'fas fa-file-video'
        };
        return icons[ext] || 'fas fa-file';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    navigateTo(path) {
        this.loadFiles(path);
    }
    
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const parts = this.currentPath.split('/').filter(p => p);
        
        let html = '<span class="breadcrumb-item" data-path="">My Drive</span>';
        let currentPath = '';
        
        parts.forEach(part => {
            currentPath += (currentPath ? '/' : '') + part;
            html += `<span class="breadcrumb-item" data-path="${currentPath}">${part}</span>`;
        });
        
        breadcrumb.innerHTML = html;
    }
    
    async createFolder() {
        const nameInput = document.getElementById('folderName');
        const name = nameInput.value.trim();
        
        if (!name) {
            alert('Please enter folder name');
            return;
        }
        
        const path = this.currentPath ? `${this.currentPath}/${name}` : name;
        
        this.showLoading('Creating folder...');
        
        try {
            await auth.createDirectory(path);
            nameInput.value = '';
            this.closeAllModals();
            this.loadFiles(this.currentPath);
        } catch (error) {
            alert('Error creating folder: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    async handleFileUpload(fileList) {
        if (fileList.length === 0) return;
        
        this.showLoading(`Uploading ${fileList.length} file(s)...`);
        
        try {
            for (const file of fileList) {
                const path = this.currentPath ? `${this.currentPath}/${file.name}` : file.name;
                await auth.uploadLargeFile(path, file);
            }
            
            this.loadFiles(this.currentPath);
            this.updateStorageInfo();
        } catch (error) {
            alert('Error uploading files: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    async downloadFile(file) {
        this.showLoading('Preparing download...');
        
        try {
            const fileData = await auth.downloadFile(file.path);
            
            // Create download link
            const link = document.createElement('a');
            link.href = fileData.download_url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            alert('Error downloading file: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    async deleteFile(file) {
        if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
            return;
        }
        
        this.showLoading('Deleting file...');
        
        try {
            await auth.deleteFile(file.path, file.sha);
            this.loadFiles(this.currentPath);
            this.updateStorageInfo();
        } catch (error) {
            alert('Error deleting file: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    showNewFolderModal() {
        document.getElementById('newFolderModal').style.display = 'flex';
        document.getElementById('folderName').focus();
    }
    
    showRenameModal(file) {
        this.renamingFile = file;
        const modal = document.getElementById('renameModal');
        const input = document.getElementById('renameInput');
        input.value = file.name;
        modal.style.display = 'flex';
        input.focus();
    }
    
    async confirmRename() {
        const newName = document.getElementById('renameInput').value.trim();
        
        if (!newName || !this.renamingFile) {
            return;
        }
        
        if (newName === this.renamingFile.name) {
            this.closeAllModals();
            return;
        }
        
        this.showLoading('Renaming...');
        
        try {
           
            const oldPath = this.renamingFile.path;
            const newPath = oldPath.replace(this.renamingFile.name, newName);
            
          
            const fileData = await auth.downloadFile(oldPath);
            
           
            await auth.createFile(newPath, fileData.content, `Rename ${this.renamingFile.name} to ${newName}`);
            
           
            await auth.deleteFile(oldPath, this.renamingFile.sha, `Delete old file after rename`);
            
            this.closeAllModals();
            this.loadFiles(this.currentPath);
        } catch (error) {
            alert('Error renaming file: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    toggleFileSelection(file, selected) {
        if (selected) {
            this.selectedFiles.add(file);
        } else {
            this.selectedFiles.delete(file);
        }
        
        const fileElement = document.querySelector(`.file-item[data-path="${file.path}"]`);
        if (fileElement) {
            fileElement.classList.toggle('selected', selected);
        }
    }
    
    selectAllFiles() {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            const fileItem = checkbox.closest('.file-item');
            const file = this.files.find(f => f.path === fileItem.dataset.path);
            if (file) {
                this.selectedFiles.add(file);
                fileItem.classList.add('selected');
            }
        });
    }
    
    async deleteSelectedFiles() {
        if (this.selectedFiles.size === 0) {
            alert('No files selected');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedFiles.size} selected file(s)?`)) {
            return;
        }
        
        this.showLoading(`Deleting ${this.selectedFiles.size} file(s)...`);
        
        try {
            for (const file of this.selectedFiles) {
                await auth.deleteFile(file.path, file.sha);
            }
            
            this.selectedFiles.clear();
            this.loadFiles(this.currentPath);
            this.updateStorageInfo();
        } catch (error) {
            alert('Error deleting files: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    async downloadSelectedFiles() {
        if (this.selectedFiles.size === 0) {
            alert('No files selected');
            return;
        }
        
        if (this.selectedFiles.size > 5) {
            alert('For performance reasons, please select up to 5 files at a time');
            return;
        }
        
        this.showLoading(`Preparing ${this.selectedFiles.size} file(s) for download...`);
        
        try {
            for (const file of this.selectedFiles) {
                await this.downloadFile(file);
               
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.selectedFiles.clear();
        } catch (error) {
            alert('Error downloading files: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    showFileInfo(file) {
        const infoPanel = document.getElementById('infoPanel');
        const fileInfo = document.getElementById('fileInfo');
        
        const isFolder = file.type === 'dir';
        const icon = isFolder ? 'fas fa-folder' : this.getFileIcon(file.name);
        
        fileInfo.innerHTML = `
            <div class="file-icon-large">
                <i class="${icon}"></i>
            </div>
            <h4>${file.name}</h4>
            <p><strong>Type:</strong> ${isFolder ? 'Folder' : 'File'}</p>
            ${!isFolder ? `<p><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>` : ''}
            <p><strong>Path:</strong> ${file.path}</p>
            <p><strong>Last Modified:</strong> ${new Date().toLocaleDateString()}</p>
            <div class="info-actions">
                <button class="btn-primary" onclick="driveManager.downloadFile(${JSON.stringify(file)})">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        infoPanel.classList.add('active');
    }
    
    async updateStorageInfo() {
        try {
           
            let totalSize = 0;
            this.files.forEach(file => {
                if (file.type !== 'dir') {
                    totalSize += file.size || 0;
                }
            });
            
            const usedMB = (totalSize / (1024 * 1024)).toFixed(2);
            const percentage = Math.min((usedMB / 1024) * 100, 100); // 1GB limit
            
            document.getElementById('storageFill').style.width = `${percentage}%`;
            document.getElementById('storageText').textContent = `${usedMB} MB of 1 GB`;
        } catch (error) {
            console.error('Error updating storage info:', error);
        }
    }
    
    searchFiles(query) {
        if (!query.trim()) {
            this.renderFiles();
            return;
        }
        
        const filtered = this.files.filter(file => 
            file.name.toLowerCase().includes(query.toLowerCase())
        );
        
        const filesGrid = document.getElementById('filesGrid');
        filesGrid.innerHTML = '';
        
        if (filtered.length === 0) {
            filesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No files found</h3>
                    <p>No files match your search</p>
                </div>
            `;
            return;
        }
        
        filtered.forEach(file => {
            const fileItem = this.createFileElement(file);
            filesGrid.appendChild(fileItem);
        });
    }
    
    setViewMode(mode) {
        this.viewMode = mode;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });
        
        const filesGrid = document.getElementById('filesGrid');
        filesGrid.className = mode === 'grid' ? 'files-grid' : 'files-list';
    }
    
    setFilter(filter) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filter === filter);
        });
        
    }
    
    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        document.getElementById('loadingText').textContent = text;
        overlay.style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.renamingFile = null;
    }
}


window.driveManager = new GitHubDriveManager();