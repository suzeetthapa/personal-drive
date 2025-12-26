// Enhanced File Preview System

class FilePreview {
    constructor() {
        this.currentFile = null;
        this.init();
    }
    
    init() {
        // Keyboard shortcuts for preview
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePreview();
            }
        });
        
        // Close preview when clicking outside
        document.getElementById('previewModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') {
                this.closePreview();
            }
        });
    }
    
    async preview(file) {
        this.currentFile = file;
        
        const modal = document.getElementById('previewModal');
        const title = document.getElementById('previewTitle');
        const subtitle = document.getElementById('previewSubtitle');
        const body = document.getElementById('previewBody');
        
        // Update modal info
        title.textContent = file.name;
        subtitle.textContent = `${this.formatFileSize(file.size)} • ${this.formatDate(file.updated_at)}`;
        
        // Show loading
        body.innerHTML = `
            <div class="preview-loading">
                <div class="spinner"></div>
                <p>Loading preview...</p>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        try {
            const fileType = this.getFileType(file.name);
            
            switch (fileType) {
                case 'image':
                    await this.previewImage(file, body);
                    break;
                case 'pdf':
                    await this.previewPDF(file, body);
                    break;
                case 'text':
                case 'code':
                    await this.previewText(file, body);
                    break;
                case 'video':
                    await this.previewVideo(file, body);
                    break;
                case 'audio':
                    await this.previewAudio(file, body);
                    break;
                default:
                    this.showUnsupportedPreview(file, body);
            }
        } catch (error) {
            console.error('Preview error:', error);
            this.showErrorPreview(error, body);
        }
    }
    
    async previewImage(file, container) {
        container.innerHTML = `
            <div class="image-preview">
                <img src="${file.download_url}" alt="${file.name}" 
                     onload="this.style.opacity='1'" 
                     style="opacity:0; transition: opacity 0.3s;">
                <div class="image-controls">
                    <button class="btn-icon" onclick="this.closest('.image-preview').querySelector('img').style.transform='scale(1)'">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button class="btn-icon" onclick="this.closest('.image-preview').querySelector('img').style.transform='scale(1.5)'">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="btn-icon" onclick="this.closest('.image-preview').querySelector('img').style.transform='rotate(90deg)'">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    async previewPDF(file, container) {
        container.innerHTML = `
            <div class="pdf-preview-container">
                <iframe src="${file.download_url}" 
                        class="pdf-viewer"
                        frameborder="0"
                        allowfullscreen></iframe>
                <div class="pdf-controls">
                    <button class="btn-icon" onclick="this.closest('.pdf-preview-container').querySelector('.pdf-viewer').contentWindow.postMessage('prev', '*')">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="page-info">Page: <span id="pageNumber">1</span></span>
                    <button class="btn-icon" onclick="this.closest('.pdf-preview-container').querySelector('.pdf-viewer').contentWindow.postMessage('next', '*')">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    async previewText(file, container) {
        try {
            const response = await fetch(file.download_url, {
                headers: window.auth.getHeaders()
            });
            const text = await response.text();
            
            const language = this.detectLanguage(file.name);
            const highlighted = this.highlightSyntax(text, language);
            
            container.innerHTML = `
                <div class="text-preview">
                    <div class="text-header">
                        <span class="language-badge">${language.toUpperCase()}</span>
                        <button class="btn-icon copy-btn" onclick="navigator.clipboard.writeText(\`${this.escapeText(text)}\`)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    <pre><code class="language-${language}">${highlighted}</code></pre>
                </div>
            `;
            
            // Add syntax highlighting if needed
            this.applySyntaxHighlighting(language);
        } catch (error) {
            container.innerHTML = `
                <pre class="plain-text">${this.escapeHtml(text)}</pre>
            `;
        }
    }
    
    async previewVideo(file, container) {
        container.innerHTML = `
            <div class="video-preview">
                <video controls style="max-width: 100%; max-height: 70vh;">
                    <source src="${file.download_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
    }
    
    async previewAudio(file, container) {
        container.innerHTML = `
            <div class="audio-preview">
                <audio controls style="width: 100%;">
                    <source src="${file.download_url}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                <div class="audio-info">
                    <h4>${file.name}</h4>
                    <p>${this.formatFileSize(file.size)}</p>
                </div>
            </div>
        `;
    }
    
    showUnsupportedPreview(file, container) {
        container.innerHTML = `
            <div class="unsupported-preview">
                <i class="fas fa-file" style="font-size: 4rem; color: var(--gray); margin-bottom: 20px;"></i>
                <h3>Preview Not Available</h3>
                <p>This file type cannot be previewed in the browser.</p>
                <div class="preview-actions">
                    <button onclick="driveManager.downloadFile(${JSON.stringify(file)})" class="btn-primary">
                        <i class="fas fa-download"></i> Download File
                    </button>
                </div>
            </div>
        `;
    }
    
    showErrorPreview(error, container) {
        container.innerHTML = `
            <div class="error-preview">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--warning); margin-bottom: 20px;"></i>
                <h3>Preview Failed</h3>
                <p>${error.message || 'Unable to load preview'}</p>
                <div class="preview-actions">
                    <button onclick="driveManager.refreshFiles()" class="btn-secondary">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            </div>
        `;
    }
    
    closePreview() {
        document.getElementById('previewModal').style.display = 'none';
        this.currentFile = null;
    }
    
    // Utility Methods
    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        const types = {
            // Images
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
            'webp': 'image', 'bmp': 'image', 'svg': 'image', 'ico': 'image',
            
            // Documents
            'pdf': 'pdf',
            'doc': 'document', 'docx': 'document', 'txt': 'text', 'rtf': 'document',
            'odt': 'document', 'md': 'text', 'csv': 'text',
            
            // Code
            'js': 'code', 'html': 'code', 'css': 'code', 'json': 'code',
            'xml': 'code', 'py': 'code', 'java': 'code', 'cpp': 'code',
            'c': 'code', 'php': 'code', 'rb': 'code', 'go': 'code',
            
            // Video
            'mp4': 'video', 'webm': 'video', 'avi': 'video', 'mov': 'video',
            'wmv': 'video', 'flv': 'video', 'mkv': 'video',
            
            // Audio
            'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'm4a': 'audio',
            'flac': 'audio'
        };
        
        return types[ext] || 'file';
    }
    
    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const languages = {
            'js': 'javascript', 'html': 'html', 'css': 'css', 'json': 'json',
            'xml': 'xml', 'py': 'python', 'java': 'java', 'cpp': 'cpp',
            'c': 'c', 'php': 'php', 'rb': 'ruby', 'go': 'go',
            'md': 'markdown', 'txt': 'plaintext', 'csv': 'plaintext'
        };
        return languages[ext] || 'plaintext';
    }
    
    highlightSyntax(text, language) {
        // Simple syntax highlighting for common languages
        if (language === 'javascript') {
            return this.highlightJS(text);
        } else if (language === 'html') {
            return this.highlightHTML(text);
        } else if (language === 'css') {
            return this.highlightCSS(text);
        }
        return this.escapeHtml(text);
    }
    
    highlightJS(text) {
        // Simple JS highlighting
        const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'async', 'await'];
        const special = ['true', 'false', 'null', 'undefined'];
        
        let highlighted = this.escapeHtml(text);
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        
        special.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="special">${word}</span>`);
        });
        
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        
        // Comments
        highlighted = highlighted.replace(/\/\/.*$/gm, '<span class="comment">$&</span>');
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
        
        return highlighted;
    }
    
    highlightHTML(text) {
        let highlighted = this.escapeHtml(text);
        
        // Tags
        highlighted = highlighted.replace(/&lt;\/?(\w+)[^&]*&gt;/g, '<span class="tag">&lt;$1&gt;</span>');
        
        // Attributes
        highlighted = highlighted.replace(/(\w+)=/g, '<span class="attr">$1=</span>');
        
        // Strings in attributes
        highlighted = highlighted.replace(/"[^"]*"/g, '<span class="string">$&</span>');
        
        return highlighted;
    }
    
    highlightCSS(text) {
        let highlighted = this.escapeHtml(text);
        
        // Selectors
        highlighted = highlighted.replace(/([^{}]+){/g, '<span class="selector">$1</span>{');
        
        // Properties
        highlighted = highlighted.replace(/([^:]+):/g, '<span class="property">$1</span>:');
        
        // Values
        highlighted = highlighted.replace(/:[^;]+;/g, (match) => {
            return ':' + match.slice(1, -1).replace(/(#?\w+)/g, '<span class="value">$1</span>') + ';';
        });
        
        return highlighted;
    }
    
    applySyntaxHighlighting(language) {
        // Add CSS for syntax highlighting if needed
        if (!document.getElementById('syntax-css')) {
            const style = document.createElement('style');
            style.id = 'syntax-css';
            style.textContent = `
                .keyword { color: #d73a49; }
                .special { color: #005cc5; }
                .string { color: #032f62; }
                .comment { color: #6a737d; font-style: italic; }
                .tag { color: #22863a; }
                .attr { color: #6f42c1; }
                .selector { color: #e36209; }
                .property { color: #005cc5; }
                .value { color: #032f62; }
                pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
                code { font-family: 'SF Mono', Monaco, 'Courier New', monospace; }
            `;
            document.head.appendChild(style);
        }
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
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    escapeText(text) {
        return text.replace(/`/g, '\\`');
    }
}

// Initialize preview system
const filePreview = new FilePreview();
window.filePreview = filePreview;

// Integrate with main app
if (window.driveManager) {
    window.driveManager.previewFile = (file) => filePreview.preview(file);
}