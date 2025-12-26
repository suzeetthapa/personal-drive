// GitHub Drive Manager - Main Application

class GitHubDriveManager {
    constructor() {
        this.currentPath = '';
        this.selectedFiles = new Set();
        this.files = [];
        this.filteredFiles = [];
        this.viewMode = 'grid';
        this.currentFilter = 'all';
        this.sortBy = 'name';
        this.editingFile = null;
        this.isSelecting = false;
        this.stats = {
            folders: 0,
            files: 0,
            images: 0,
            pdfs: 0,
            totalSize: 0
        };
        
        this.init();
    }
    
    init() {
        if (!window.auth || !window.auth.token) {
            return;
        }
        
        this.setupEventListeners();
        this.loadFiles();
        this.updateStorageStats();
        
        // Set initial view
        this.setViewMode('grid');
    }
    
    setupEventListeners() {
        // Navigation
        document.getElementById('menuToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
        
        // File operations
        document.getElementById('newFolderBtn')?.addEventListener('click', () => this.showFolderModal());
        document.getElementById('createFolderBtn')?.addEventListener('click', () => this.createFolder());
        document.getElementById('createFirstFolder')?.addEventListener('click', () => this.showFolderModal());
        
        // File upload
        document.getElementById('fileUpload')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
        
        // Refresh
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshFiles();
        });
        
        // Search
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchFiles(e.target.value);
        });
        
        // Sort
        document.getElementById('sortSelect')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortFiles();
            this.renderFiles();
        });
        
        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.view-btn').dataset.view;
                this.setViewMode(view);
            });
        });
        
        // Navigation menu
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.setFilter(filter);
            });
        });
        
        // Breadcrumb
        document.getElementById('breadcrumb')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('crumb')) {
                const path = e.target.dataset.path || '';
                this.navigateTo(path);
            }
        });
        
        // Selection tools
        document.getElementById('cancelSelectBtn')?.addEventListener('click', () => {
            this.cancelSelection();
        });
        
        document.getElementById('downloadSelectedBtn')?.addEventListener('click', () => {
            this.downloadSelectedFiles();
        });
        
        document.getElementById('deleteSelectedBtn')?.addEventListener('click', () => {
            this.deleteSelectedFiles();
        });
        
        document.getElementById('starSelectedBtn')?.addEventListener('click', () => {
            this.starSelectedFiles();
        });
        
        // Modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        document.getElementById('confirmRenameBtn')?.addEventListener('click', () => {
            this.confirmRename();
        });
        
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
            this.confirmDelete();
        });
        
        document.getElementById('closePreviewBtn')?.addEventListener('click', () => {
            this.closePreview();
        });
        
        document.getElementById('downloadPreviewBtn')?.addEventListener('click', () => {
            this.downloadPreviewFile();
        });
        
        // Mobile navigation
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleMobileAction(action);
            });
        });
        
        // Upload progress close
        document.getElementById('uploadClose')?.addEventListener('click', () => {
            document.getElementById('uploadProgress').style.display = 'none';
        });
    }
    
    async loadFiles(path = '') {
        auth.showLoading('Loading files...');
        
        try {
            this.files = await auth.listFiles(path);
            this.currentPath = path;
            this.updateStats();
            this.filterFiles();
            this.sortFiles();
            this.renderFiles();
            this.updateBreadcrumb();
            this.updateStorageStats();
            
            auth.showToast(`Loaded ${this.files.length} items`, 'success');
        } catch (error) {
            console.error('Error loading files:', error);
            auth.showToast('Failed to load files', 'error');
        } finally {
            auth.hideLoading();
        }
    }
    
    updateStats() {
        this.stats = {
            folders: 0,
            files: 0,
            images: 0,
            pdfs: 0,
            totalSize: 0
        };
        
        this.files.forEach(file => {
            if (file.type === 'dir') {
                this.stats.folders++;
            } else {
                this.stats.files++;
                this.stats.totalSize += file.size || 0;
                
                if (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
                    this.stats.images++;
                } else if (file.name.match(/\.pdf$/i)) {
                    this.stats.pdfs++;
                }
            }
        });
        
        // Update UI
        document.getElementById('folderCount').textContent = this.stats.folders;
        document.getElementById('fileCount').textContent = this.stats.files;
        document.getElementById('imageCount').textContent = this.stats.images;
        document.getElementById('pdfCount').textContent = this.stats.pdfs;
    }
    
    filterFiles() {
        switch (this.currentFilter) {
            case 'folders':
                this.filteredFiles = this.files.filter(f => f.type === 'dir');
                break;
            case 'images':
                this.filteredFiles = this.files.filter(f => 
                    f.type === 'file' && f.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)
                );
                break;
            case 'documents':
                this.filteredFiles = this.files.filter(f => 
                    f.type === 'file' && f.name.match(/\.(pdf|doc|docx|txt|rtf)$/i)
                );
                break;
            case 'recent':
                // Show files from last 7 days
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                this.filteredFiles = this.files.filter(f => {
                    const fileDate = new Date(f.updated_at || f.created_at);
                    return fileDate > weekAgo;
                });
                break;
            default:
                this.filteredFiles = [...this.files];
        }
    }
    
    sortFiles() {
        this.filteredFiles.sort((a, b) => {
            switch (this.sortBy) {
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'date':
                    return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
                case 'date_old':
                    return new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at);
                case 'size':
                    return (b.size || 0) - (a.size || 0);
                case 'size_small':
                    return (a.size || 0) - (b.size || 0);
                default: // 'name'
                    return a.name.localeCompare(b.name);
            }
        });
    }
    
    renderFiles() {
        const container = document.getElementById('fileContainer');
        if (!container) return;
        
        if (this.filteredFiles.length === 0) {
            container.innerHTML = `
                <div class="empty-state" id="emptyState">
                    <i class="fas fa-${this.getEmptyStateIcon()}"></i>
                    <h3>${this.getEmptyStateTitle()}</h3>
                    <p>${this.getEmptyStateMessage()}</p>
                    ${this.currentFilter === 'all' ? `
                        <div class="empty-actions">
                            <label for="fileUpload" class="btn-primary">
                                <i class="fas fa-cloud-upload-alt"></i> Upload Files
                            </label>
                            <button id="createFirstFolder" class="btn-secondary">
                                <i class="fas fa-folder-plus"></i> Create Folder
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Re-attach event listener
            document.getElementById('createFirstFolder')?.addEventListener('click', () => {
                this.showFolderModal();
            });
            
            return;
        }
        
        container.innerHTML = '';
        
        this.filteredFiles.forEach(file => {
            const fileElement = this.createFileElement(file);
            container.appendChild(fileElement);
        });
    }
    
    createFileElement(file) {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.dataset.id = file.sha;
        div.dataset.type = file.type;
        div.dataset.path = file.path;
        
        if (this.selectedFiles.has(file.sha)) {
            div.classList.add('selected');
        }
        
        const isFolder = file.type === 'dir';
        const fileType = this.getFileType(file.name);
        const icon = this.getFileIcon(fileType);
        const size = this.formatFileSize(file.size);
        const date = this.formatDate(file.updated_at || file.created_at);
        
        div.innerHTML = `
            <div class="file-icon ${fileType}">
                <i class="${icon}"></i>
            </div>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">${isFolder ? 'Folder' : `${size} • ${date}`}</div>
            </div>
            <div class="file-actions">
                ${!isFolder ? `
                    <button class="btn-icon preview-btn" title="Preview">
                        <i class="fas fa-eye"></i>
                    </button>
                ` : ''}
                <button class="btn-icon download-btn" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-icon rename-btn" title="Rename">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
            <input type="checkbox" class="file-checkbox" ${this.selectedFiles.has(file.sha) ? 'checked' : ''}>
        `;
        
        // Event listeners
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-checkbox') || 
                e.target.closest('.file-actions')) {
                return;
            }
            
            if (isFolder) {
                this.navigateTo(file.path);
            } else {
                this.previewFile(file);
            }
        });
        
        // Checkbox
        const checkbox = div.querySelector('.file-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFileSelection(file, checkbox.checked);
        });
        
        // Action buttons
        div.querySelector('.download-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadFile(file);
        });
        
        div.querySelector('.rename-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showRenameModal(file);
        });
        
        if (!isFolder) {
            div.querySelector('.preview-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.previewFile(file);
            });
        }
        
        return div;
    }
    
    async navigateTo(path) {
        await this.loadFiles(path);
    }
    
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        
        const parts = this.currentPath.split('/').filter(p => p);
        
        let html = '<span class="crumb" data-path="">My Drive</span>';
        let currentPath = '';
        
        parts.forEach(part => {
            currentPath += (currentPath ? '/' : '') + part;
            html += `<span class="crumb" data-path="${currentPath}">${part}</span>`;
        });
        
        breadcrumb.innerHTML = html;
    }
    
    async createFolder() {
        const nameInput = document.getElementById('folderName');
        const name = nameInput.value.trim();
        
        if (!name) {
            auth.showToast('Please enter folder name', 'error');
            return;
        }
        
        const path = this.currentPath ? `${this.currentPath}/${name}` : name;
        
        auth.showLoading('Creating folder...');
        
        try {
            // Create README.md in the folder
            const readmePath = `${path}/README.md`;
            const content = `# ${name}\n\nFolder created by Personal Drive.`;
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            
            await auth.createFile(readmePath, encodedContent, `Create folder: ${name}`);
            
            nameInput.value = '';
            this.closeAllModals();
            await this.loadFiles(this.currentPath);
            auth.showToast('Folder created successfully', 'success');
        } catch (error) {
            console.error('Error creating folder:', error);
            auth.showToast('Failed to create folder', 'error');
        } finally {
            auth.hideLoading();
        }
    }
    
    async handleFileUpload(fileList) {
        if (fileList.length === 0) return;
        
        const progressContainer = document.getElementById('uploadProgress');
        const progressList = document.getElementById('progressList');
        
        progressList.innerHTML = '';
        progressContainer.style.display = 'block';
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const file of fileList) {
            const progressItem = this.createProgressItem(file.name);
            progressList.appendChild(progressItem);
            
            try {
                await auth.uploadFile(file, this.currentPath);
                
                progressItem.querySelector('.progress-name').innerHTML = `
                    <span>${file.name}</span>
                    <span style="color: var(--secondary);"><i class="fas fa-check"></i></span>
                `;
                progressItem.querySelector('.progress-bar-fill').style.width = '100%';
                
                successCount++;
            } catch (error) {
                console.error('Upload error:', error);
                
                progressItem.querySelector('.progress-name').innerHTML = `
                    <span>${file.name}</span>
                    <span style="color: var(--danger);"><i class="fas fa-times"></i></span>
                `;
                progressItem.querySelector('.progress-bar-fill').style.background = 'var(--danger)';
                progressItem.querySelector('.progress-bar-fill').style.width = '100%';
                
                errorCount++;
            }
        }
        
        // Refresh file list
        await this.loadFiles(this.currentPath);
        
        // Show summary
        setTimeout(() => {
            if (successCount > 0) {
                auth.showToast(`Uploaded ${successCount} file(s) successfully`, 'success');
            }
            if (errorCount > 0) {
                auth.showToast(`Failed to upload ${errorCount} file(s)`, 'error');
            }
        }, 500);
    }
    
    createProgressItem(filename) {
        const div = document.createElement('div');
        div.className = 'progress-item';
        div.innerHTML = `
            <div class="progress-name">
                <span>${filename}</span>
                <span><i class="fas fa-spinner fa-spin"></i></span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill"></div>
            </div>
        `;
        return div;
    }
    
    async downloadFile(file) {
        auth.showLoading('Preparing download...');
        
        try {
            await auth.downloadFile(file);
            auth.showToast(`Downloaded ${file.name}`, 'success');
        } catch (error) {
            console.error('Download error:', error);
            auth.showToast('Failed to download file', 'error');
        } finally {
            auth.hideLoading();
        }
    }
    
    async deleteFile(file) {
        this.editingFile = file;
        this.showDeleteModal(file);
    }
    
    async renameFile(file, newName) {
        if (!newName || newName === file.name) return;
        
        auth.showLoading('Renaming...');
        
        try {
            // Get file content
            const fileInfo = await auth.apiRequest(`/repos/${auth.repoOwner}/${auth.repoName}/contents/${encodeURIComponent(file.path)}`);
            
            // Create new file with new name
            const newPath = file.path.replace(file.name, newName);
            await auth.createFile(newPath, fileInfo.content, `Rename: ${file.name} → ${newName}`);
            
            // Delete old file
            await auth.deleteFile(file.path, file.sha, `Delete old file after rename`);
            
            await this.loadFiles(this.currentPath);
            auth.showToast('File renamed successfully', 'success');
        } catch (error) {
            console.error('Rename error:', error);
            auth.showToast('Failed to rename file', 'error');
        } finally {
            auth.hideLoading();
        }
    }
    
    // Selection Management
    toggleFileSelection(file, selected) {
        if (selected) {
            this.selectedFiles.add(file.sha);
            this.showSelectionTools();
        } else {
            this.selectedFiles.delete(file.sha);
            if (this.selectedFiles.size === 0) {
                this.hideSelectionTools();
            }
        }
        
        this.updateSelectionUI();
    }
    
    showSelectionTools() {
        const tools = document.getElementById('selectionTools');
        if (tools) {
            tools.style.display = 'flex';
        }
        this.isSelecting = true;
    }
    
    hideSelectionTools() {
        const tools = document.getElementById('selectionTools');
        if (tools) {
            tools.style.display = 'none';
        }
        this.isSelecting = false;
    }
    
    updateSelectionUI() {
        document.getElementById('selectedCount').textContent = `${this.selectedFiles.size} selected`;
        
        // Update checkboxes in UI
        document.querySelectorAll('.file-item').forEach(item => {
            const checkbox = item.querySelector('.file-checkbox');
            if (checkbox) {
                checkbox.checked = this.selectedFiles.has(item.dataset.id);
                item.classList.toggle('selected', checkbox.checked);
            }
        });
    }
    
    cancelSelection() {
        this.selectedFiles.clear();
        this.hideSelectionTools();
        this.updateSelectionUI();
    }
    
    async downloadSelectedFiles() {
        if (this.selectedFiles.size === 0) return;
        
        if (this.selectedFiles.size > 5) {
            auth.showToast('Please select up to 5 files at a time', 'warning');
            return;
        }
        
        auth.showLoading(`Downloading ${this.selectedFiles.size} file(s)...`);
        
        try {
            for (const fileId of this.selectedFiles) {
                const file = this.files.find(f => f.sha === fileId);
                if (file) {
                    await auth.downloadFile(file);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
                }
            }
            
            this.cancelSelection();
            auth.showToast(`Downloaded ${this.selectedFiles.size} file(s)`, 'success');
        } catch (error) {
            auth.showToast('Failed to download some files', 'error');
        } finally {
            auth.hideLoading();
        }
    }
    
    async deleteSelectedFiles() {
        if (this.selectedFiles.size === 0) return;
        
        const fileNames = Array.from(this.selectedFiles)
            .map(id => this.files.find(f => f.sha === id)?.name)
            .filter(name => name);
        
        this.showDeleteModal(null, fileNames);
    }
    
    async starSelectedFiles() {
        // Implement starring functionality
        auth.showToast('Star feature coming soon!', 'info');
    }
    
    // Preview functionality
    async previewFile(file) {
        const modal = document.getElementById('previewModal');
        const title = document.getElementById('previewTitle');
        const subtitle = document.getElementById('previewSubtitle');
        const body = document.getElementById('previewBody');
        
        title.textContent = file.name;
        subtitle.textContent = `${this.formatFileSize(file.size)} • ${this.formatDate(file.updated_at)}`;
        
        // Clear previous content
        body.innerHTML = '<div class="spinner"></div>';
        
        modal.style.display = 'flex';
        
        try {
            const fileType = this.getFileType(file.name);
            
            if (fileType === 'image') {
                // For images, use download URL directly
                body.innerHTML = `<img src="${file.download_url}" alt="${file.name}" style="max-width: 100%; max-height: 100%;">`;
            } else if (fileType === 'pdf') {
                // For PDFs, use iframe
                body.innerHTML = `
                    <iframe src="${file.download_url}" class="pdf-preview" frameborder="0"></iframe>
                `;
            } else if (fileType === 'text') {
                // For text files, fetch and display content
                const response = await fetch(file.download_url, {
                    headers: auth.getHeaders()
                });
                const text = await response.text();
                body.innerHTML = `
                    <pre style="white-space: pre-wrap; font-family: monospace; padding: 20px; background: #f5f5f5; border-radius: 8px; max-height: 70vh; overflow: auto;">${this.escapeHtml(text)}</pre>
                `;
            } else {
                body.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-file" style="font-size: 4rem; color: var(--gray); margin-bottom: 20px;"></i>
                        <p>Preview not available for this file type</p>
                        <button onclick="driveManager.downloadFile(${JSON.stringify(file)})" class="btn-primary">
                            <i class="fas fa-download"></i> Download to View
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Preview error:', error);
            body.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--warning); margin-bottom: 20px;"></i>
                    <p>Failed to load preview</p>
                    <button onclick="driveManager.downloadFile(${JSON.stringify(file)})" class="btn-primary">
                        <i class="fas fa-download"></i> Download Instead
                    </button>
                </div>
            `;
        }
    }
    
    closePreview() {
        document.getElementById('previewModal').style.display = 'none';
    }
    
    async downloadPreviewFile() {
        const file = this.files.find(f => f.name === document.getElementById('previewTitle').textContent);
        if (file) {
            await this.downloadFile(file);
        }
    }
    
    // Modals
    showFolderModal() {
        document.getElementById('folderModal').style.display = 'flex';
        document.getElementById('folderName').focus();
    }
    
    showRenameModal(file) {
        this.editingFile = file;
        document.getElementById('renameModal').style.display = 'flex';
        document.getElementById('renameInput').value = file.name;
        document.getElementById('renameInput').focus();
    }
    
    async confirmRename() {
        const newName = document.getElementById('renameInput').value.trim();
        if (newName && this.editingFile) {
            await this.renameFile(this.editingFile, newName);
            this.closeAllModals();
        }
    }
    
    showDeleteModal(file = null, fileNames = []) {
        this.editingFile = file;
        
        const message = document.getElementById('deleteMessage');
        if (fileNames.length > 0) {
            const names = fileNames.slice(0, 3).join(', ');
            const more = fileNames.length > 3 ? ` and ${fileNames.length - 3} more` : '';
            message.textContent = `Are you sure you want to delete ${names}${more}? This action cannot be undone.`;
        } else if (file) {
            message.textContent = `Are you sure you want to delete "${file.name}"? This action cannot be undone.`;
        }
        
        document.getElementById('deleteModal').style.display = 'flex';
    }
    
    async confirmDelete() {
        auth.showLoading('Deleting...');
        
        try {
            if (this.editingFile) {
                // Delete single file
                await auth.deleteFile(this.editingFile.path, this.editingFile.sha);
                auth.showToast('File deleted successfully', 'success');
            } else if (this.selectedFiles.size > 0) {
                // Delete multiple files
                let deleted = 0;
                for (const fileId of this.selectedFiles) {
                    const file = this.files.find(f => f.sha === fileId);
                    if (file) {
                        await auth.deleteFile(file.path, file.sha);
                        deleted++;
                    }
                }
                this.cancelSelection();
                auth.showToast(`Deleted ${deleted} file(s)`, 'success');
            }
            
            this.closeAllModals();
            await this.loadFiles(this.currentPath);
        } catch (error) {
            console.error('Delete error:', error);
            auth.showToast('Failed to delete file(s)', 'error');
        } finally {
            auth.hideLoading();
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.editingFile = null;
    }
    
    // Search
    searchFiles(query) {
        if (!query.trim()) {
            this.filteredFiles = [...this.files];
            this.sortFiles();
            this.renderFiles();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        this.filteredFiles = this.files.filter(file => 
            file.name.toLowerCase().includes(searchTerm)
        );
        this.sortFiles();
        this.renderFiles();
    }
    
    // View Controls
    setViewMode(mode) {
        this.viewMode = mode;
        const container = document.getElementById('fileContainer');
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });
        
        if (container) {
            container.className = mode === 'list' ? 'file-container list-view' : 'file-container';
        }
        
        this.renderFiles();
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.classList.toggle('active', item.dataset.filter === filter);
        });
        
        this.filterFiles();
        this.sortFiles();
        this.renderFiles();
    }
    
    // Storage Stats
    async updateStorageStats() {
        try {
            const stats = await auth.getStorageStats();
            const usedMB = (stats.size / (1024 * 1024)).toFixed(2);
            const usedGB = (usedMB / 1024).toFixed(2);
            const percentage = Math.min((usedMB / 1024) * 100, 100);
            
            // Update progress circle
            const progressRing = document.getElementById('progressRing');
            const progressPercent = document.getElementById('progressPercent');
            const usedStorage = document.getElementById('usedStorage');
            const usageFill = document.getElementById('usageFill');
            
            if (progressRing) {
                const offset = 226 - (percentage * 226 / 100);
                progressRing.style.strokeDashoffset = offset;
            }
            
            if (progressPercent) {
                progressPercent.textContent = `${Math.round(percentage)}%`;
            }
            
            if (usedStorage) {
                usedStorage.textContent = usedMB < 1024 ? `${usedMB} MB` : `${usedGB} GB`;
            }
            
            if (usageFill) {
                usageFill.style.width = `${percentage}%`;
            }
            
            if (document.getElementById('storageText')) {
                document.getElementById('storageText').textContent = usedMB < 1024 ? 
                    `${usedMB} MB of 1 GB used` : `${usedGB} GB of 1 GB used`;
            }
        } catch (error) {
            console.error('Storage stats error:', error);
        }
    }
    
    // Mobile Actions
    handleMobileAction(action) {
        switch (action) {
            case 'upload':
                document.getElementById('fileUpload').click();
                break;
            case 'folder':
                this.showFolderModal();
                break;
            case 'scan':
                // Implement document scanning
                auth.showToast('Document scanning coming soon!', 'info');
                break;
            case 'search':
                document.getElementById('searchInput').focus();
                break;
            case 'menu':
                document.getElementById('sidebar').classList.toggle('active');
                break;
        }
    }
    
    // Refresh files
    async refreshFiles() {
        await this.loadFiles(this.currentPath);
    }
    
    // Utility Methods
    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
        const codeExts = ['js', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c'];
        
        if (imageExts.includes(ext)) return 'image';
        if (docExts.includes(ext)) return ext === 'pdf' ? 'pdf' : 'document';
        if (codeExts.includes(ext)) return 'code';
        return 'file';
    }
    
    getFileIcon(type) {
        const icons = {
            'folder': 'fas fa-folder',
            'image': 'fas fa-image',
            'pdf': 'fas fa-file-pdf',
            'document': 'fas fa-file-word',
            'code': 'fas fa-file-code',
            'file': 'fas fa-file'
        };
        return icons[type] || icons.file;
    }
    
    getEmptyStateIcon() {
        const icons = {
            'all': 'cloud-upload-alt',
            'folders': 'folder-open',
            'images': 'images',
            'documents': 'file-pdf',
            'recent': 'clock',
            'starred': 'star'
        };
        return icons[this.currentFilter] || 'folder-open';
    }
    
    getEmptyStateTitle() {
        const titles = {
            'all': 'Your Drive is Empty',
            'folders': 'No Folders',
            'images': 'No Images',
            'documents': 'No Documents',
            'recent': 'No Recent Files',
            'starred': 'No Starred Files'
        };
        return titles[this.currentFilter] || 'No Files Found';
    }
    
    getEmptyStateMessage() {
        const messages = {
            'all': 'Upload files or create folders to get started',
            'folders': 'Create your first folder to organize files',
            'images': 'Upload images to see them here',
            'documents': 'Upload PDFs or documents to see them here',
            'recent': 'Files you\'ve recently opened will appear here',
            'starred': 'Star important files to find them quickly'
        };
        return messages[this.currentFilter] || 'Try changing your filter';
    }
    
    formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        
        return date.toLocaleDateString();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize drive manager
const driveManager = new GitHubDriveManager();
window.driveManager = driveManager;

// Global helper function for download
window.downloadFile = (file) => driveManager.downloadFile(file);

// Auto-refresh when coming back to tab
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.driveManager) {
        window.driveManager.refreshFiles();
    }
});