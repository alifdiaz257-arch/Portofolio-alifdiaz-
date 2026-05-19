// ============ DATA STORAGE ============
let scrapeHistory = JSON.parse(localStorage.getItem('scrapeHistory') || '[]');
let ratings = JSON.parse(localStorage.getItem('websiteRatings') || '[]');
let uploadHistory = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
let selectedRating = 0;
let isAdmin = localStorage.getItem('isAdmin') === 'true';
const ADMIN_PIN = "123456";
let uploadQueue = [];
let isUploading = false;

// ============ STEP DATA ============
const stepsData = [
    { number: 1, icon: "link", title: "Masukkan URL Website", desc: "Masukkan URL website yang ingin Anda scrape di halaman Web Scraper" },
    { number: 2, icon: "play_arrow", title: "Klik Start Scraping", desc: "Tekan tombol Start Scraping untuk memulai proses ekstraksi data" },
    { number: 3, icon: "download", title: "Download Hasil Scraping", desc: "Setelah selesai, file JSON akan otomatis tersedia untuk di-download" },
    { number: 4, icon: "history", title: "Lihat History Scraping", desc: "Semua hasil scraping tersimpan di menu History untuk diakses kembali" },
    { number: 5, icon: "cloud_upload", title: "Upload File & Folder", desc: "Upload file atau folder dengan drag & drop" },
    { number: 6, icon: "star", title: "Beri Rating Website", desc: "Bantu kami berkembang dengan memberikan rating di bawah ini" }
];

// ============ WELCOME MODAL ============
function showWelcomeModal() {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            updateWelcomeStats();
            modal.classList.add('show');
            localStorage.setItem('hasSeenWelcome', 'true');
        }
    }
}

function closeWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.classList.remove('show');
}

function updateWelcomeStats() {
    let fileCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i)?.startsWith('scrape_')) fileCount++;
    }
    const welcomeScrapes = document.getElementById('welcomeTotalScrapes');
    const welcomeFiles = document.getElementById('welcomeTotalFiles');
    const welcomeUploads = document.getElementById('welcomeTotalUploads');
    
    if (welcomeScrapes) welcomeScrapes.innerText = scrapeHistory.length;
    if (welcomeFiles) welcomeFiles.innerText = fileCount;
    if (welcomeUploads) welcomeUploads.innerText = uploadHistory.length;
}

// Welcome modal event listeners
const welcomeCloseBtn = document.getElementById('welcomeCloseBtn');
if (welcomeCloseBtn) welcomeCloseBtn.addEventListener('click', closeWelcomeModal);

const startScraperBtn = document.getElementById('startScraperBtn');
if (startScraperBtn) {
    startScraperBtn.addEventListener('click', () => {
        closeWelcomeModal();
        const scraperNav = document.querySelector('.nav-item[data-page="scraper"]');
        if (scraperNav) scraperNav.click();
        showToast('🚀 Mulai scraping sekarang!');
    });
}

const welcomeModal = document.getElementById('welcomeModal');
if (welcomeModal) {
    welcomeModal.addEventListener('click', (e) => {
        if (e.target === welcomeModal) closeWelcomeModal();
    });
}

// ============ UPLOAD SYSTEM ============
function initUploadSystem() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const startUploadBtn = document.getElementById('startUploadBtn');
    const clearUploadHistoryBtn = document.getElementById('clearUploadHistoryBtn');
    
    if (selectFilesBtn) {
        selectFilesBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }
    
    if (dropZone) {
        dropZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const items = e.dataTransfer.items;
            const files = [];
            
            const traverseFileTree = (entry, path = '') => {
                if (entry.isFile) {
                    entry.file(file => {
                        file.relativePath = path + file.name;
                        files.push(file);
                    });
                } else if (entry.isDirectory) {
                    const reader = entry.createReader();
                    reader.readEntries(entries => {
                        for (let i = 0; i < entries.length; i++) {
                            traverseFileTree(entries[i], path + entry.name + '/');
                        }
                    });
                }
            };
            
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry();
                if (entry) traverseFileTree(entry);
            }
            
            setTimeout(() => {
                if (files.length > 0) addToUploadQueue(files);
            }, 100);
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) addToUploadQueue(files);
            fileInput.value = '';
        });
    }
    
    if (startUploadBtn) {
        startUploadBtn.addEventListener('click', () => {
            startUploadQueue();
        });
    }
    
    if (clearUploadHistoryBtn) {
        clearUploadHistoryBtn.addEventListener('click', () => {
            uploadHistory = [];
            localStorage.setItem('uploadHistory', JSON.stringify(uploadHistory));
            loadUploadHistory();
            showToast('🗑️ Riwayat upload dihapus!');
        });
    }
    
    loadUploadHistory();
}

function addToUploadQueue(files) {
    const newFiles = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.relativePath || file.name,
        size: file.size,
        file: file,
        status: 'pending',
        progress: 0
    }));
    
    uploadQueue = [...uploadQueue, ...newFiles];
    updateQueueUI();
    
    const startUploadBtn = document.getElementById('startUploadBtn');
    if (startUploadBtn && uploadQueue.length > 0) {
        startUploadBtn.style.display = 'flex';
    }
}

function updateQueueUI() {
    const queueList = document.getElementById('queueList');
    const queueCount = document.getElementById('queueCount');
    
    if (!queueList) return;
    
    if (queueCount) queueCount.innerText = uploadQueue.length;
    
    if (uploadQueue.length === 0) {
        queueList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">📭 Belum ada file dalam antrian</p>';
        const startUploadBtn = document.getElementById('startUploadBtn');
        if (startUploadBtn) startUploadBtn.style.display = 'none';
        return;
    }
    
    queueList.innerHTML = uploadQueue.map(item => `
        <div class="queue-item" data-id="${item.id}">
            <div class="queue-item-info">
                <span class="material-icons">${item.name.includes('/') ? 'folder' : 'insert_drive_file'}</span>
                <div class="queue-item-details">
                    <div class="queue-item-name">${escapeHtml(item.name)}</div>
                    <div class="queue-item-size">${formatFileSize(item.size)}</div>
                </div>
            </div>
            <div class="queue-item-status">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${item.progress}%"></div>
                </div>
                <span class="status-badge ${item.status}">${getStatusText(item.status)}</span>
                ${item.status === 'pending' ? `<button class="remove-queue-btn" data-id="${item.id}"><span class="material-icons">close</span></button>` : ''}
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.remove-queue-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseFloat(btn.dataset.id);
            uploadQueue = uploadQueue.filter(item => item.id !== id);
            updateQueueUI();
        });
    });
}

async function startUploadQueue() {
    if (isUploading) return;
    isUploading = true;
    
    const pendingItems = uploadQueue.filter(item => item.status === 'pending');
    
    for (const item of pendingItems) {
        await uploadSingleFile(item);
    }
    
    isUploading = false;
    showToast('✅ Semua file selesai diupload!');
    updateQueueUI();
}

function uploadSingleFile(item) {
    return new Promise((resolve) => {
        item.status = 'uploading';
        updateQueueUI();
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            item.progress = Math.min(progress, 100);
            updateQueueUI();
            
            if (progress >= 100) {
                clearInterval(interval);
                item.status = 'success';
                updateQueueUI();
                
                const historyItem = {
                    id: item.id,
                    name: item.name,
                    size: item.size,
                    date: new Date().toISOString(),
                    type: item.name.includes('/') ? 'folder' : 'file'
                };
                uploadHistory.unshift(historyItem);
                if (uploadHistory.length > 20) uploadHistory.pop();
                localStorage.setItem('uploadHistory', JSON.stringify(uploadHistory));
                loadUploadHistory();
                updateWelcomeStats();
                updateDashboard();
                
                resolve();
            }
        }, 100);
    });
}

function loadUploadHistory() {
    const historyUploadList = document.getElementById('historyUploadList');
    if (!historyUploadList) return;
    
    if (uploadHistory.length === 0) {
        historyUploadList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">📭 Belum ada riwayat upload</p>';
        return;
    }
    
    historyUploadList.innerHTML = uploadHistory.map(item => `
        <div class="history-item">
            <div class="history-item-info">
                <span class="material-icons">${item.type === 'folder' ? 'folder' : 'insert_drive_file'}</span>
                <div>
                    <div class="history-item-name">${escapeHtml(item.name)}</div>
                    <div class="history-item-date">${new Date(item.date).toLocaleString()}</div>
                </div>
            </div>
            <div class="history-item-size">${formatFileSize(item.size)}</div>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Menunggu';
        case 'uploading': return 'Uploading...';
        case 'success': return 'Berhasil';
        case 'error': return 'Gagal';
        default: return 'Unknown';
    }
}

// ============ LOAD STEPS ============
function loadSteps() {
    const stepsGrid = document.getElementById('stepsGrid');
    if (!stepsGrid) return;
    
    stepsGrid.innerHTML = `
        <div class="skeleton-wrapper">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;
    
    setTimeout(() => {
        const stepsHTML = stepsData.map((step, idx) => `
            <div class="step-card" style="animation-delay: ${idx * 0.08}s">
                <div class="step-number">${step.number}</div>
                <span class="material-icons step-icon">${step.icon}</span>
                <h3>${step.title}</h3>
                <p>${step.desc}</p>
            </div>
        `).join('');
        stepsGrid.innerHTML = stepsHTML;
    }, 800);
}

// ============ RATING SYSTEM ============
function loadRatings() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    if (!reviewsContainer) return;
    
    reviewsContainer.innerHTML = `
        <div class="skeleton-wrapper">
            <div class="skeleton-review"></div>
            <div class="skeleton-review"></div>
            <div class="skeleton-review"></div>
        </div>
    `;
    
    setTimeout(() => {
        if (ratings.length === 0) {
            reviewsContainer.innerHTML = '<div class="no-reviews">⭐ Belum ada ulasan. Jadilah yang pertama memberi rating!</div>';
        } else {
            const sortedRatings = [...ratings].reverse();
            reviewsContainer.innerHTML = sortedRatings.map((rating) => `
                <div class="review-card" data-review-id="${rating.id}">
                    <div class="review-header">
                        <span class="reviewer-name">
                            <span class="material-icons" style="font-size: 16px;">person</span>
                            ${escapeHtml(rating.name || 'Pengguna Anonim')}
                        </span>
                        <div class="review-stars">${'★'.repeat(rating.rating)}${'☆'.repeat(5-rating.rating)}</div>
                        <span class="review-date">${new Date(rating.date).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div class="review-text">${escapeHtml(rating.review || 'Tidak ada ulasan')}</div>
                </div>
            `).join('');
        }
        updateAverageRating();
    }, 600);
}

function updateAverageRating() {
    const avgElem = document.getElementById('averageRating');
    const totalElem = document.getElementById('totalRatings');
    
    if (ratings.length === 0) {
        if (avgElem) avgElem.innerText = '0';
        if (totalElem) totalElem.innerText = '0';
        return;
    }
    
    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average = (total / ratings.length).toFixed(1);
    if (avgElem) avgElem.innerText = average;
    if (totalElem) totalElem.innerText = ratings.length;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initStarRating() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            stars.forEach(s => {
                if (parseInt(s.dataset.value) <= selectedRating) {
                    s.innerHTML = '★';
                    s.classList.add('active');
                } else {
                    s.innerHTML = '☆';
                    s.classList.remove('active');
                }
            });
        });
        
        star.addEventListener('mouseenter', function() {
            const value = parseInt(this.dataset.value);
            stars.forEach(s => {
                if (parseInt(s.dataset.value) <= value) {
                    s.innerHTML = '★';
                } else {
                    s.innerHTML = '☆';
                }
            });
        });
        
        star.addEventListener('mouseleave', function() {
            stars.forEach(s => {
                if (selectedRating > 0 && parseInt(s.dataset.value) <= selectedRating) {
                    s.innerHTML = '★';
                } else {
                    s.innerHTML = '☆';
                }
            });
        });
    });
}

function submitRating() {
    const reviewText = document.getElementById('reviewText')?.value.trim() || '';
    const reviewerName = document.getElementById('reviewerName')?.value.trim() || '';
    
    if (selectedRating === 0) {
        showToast('⭐ Silakan pilih rating bintang terlebih dahulu!');
        return;
    }
    
    const newRating = {
        id: Date.now(),
        rating: selectedRating,
        review: reviewText || 'Tidak ada ulasan',
        date: new Date().toISOString(),
        name: reviewerName || `User_${Math.floor(Math.random() * 1000)}`
    };
    
    ratings.push(newRating);
    localStorage.setItem('websiteRatings', JSON.stringify(ratings));
    
    selectedRating = 0;
    document.querySelectorAll('.star').forEach(s => {
        s.innerHTML = '☆';
        s.classList.remove('active');
    });
    if (document.getElementById('reviewText')) document.getElementById('reviewText').value = '';
    if (document.getElementById('reviewerName')) document.getElementById('reviewerName').value = '';
    
    loadRatings();
    showToast('✅ Rating berhasil dikirim! Terima kasih atas masukannya 🙏');
}

// ============ SCROLL REVEAL ============
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length === 0) return;
    
    function checkReveal() {
        const windowHeight = window.innerHeight;
        revealElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.top <= windowHeight - 80 && rect.bottom >= 80;
            
            if (isVisible) {
                el.classList.add('active');
                el.classList.remove('hidden');
            } else {
                el.classList.remove('active');
                el.classList.add('hidden');
            }
        });
    }
    
    checkReveal();
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                checkReveal();
                ticking = false;
            });
            ticking = true;
        }
    });
    window.addEventListener('resize', () => checkReveal());
}

// ============ HAMBURGER MENU TOGGLE DENGAN ANIMASI ============
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

let isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

// Set initial state
if (isSidebarCollapsed) {
    if (sidebar) sidebar.classList.add('collapsed');
} else {
    if (sidebar) sidebar.classList.remove('collapsed');
}

// Update icon based on state
function updateMenuIcon() {
    if (menuToggle) {
        const icon = menuToggle.querySelector('.material-icons');
        if (icon) {
            if (sidebar && sidebar.classList.contains('collapsed')) {
                icon.textContent = 'menu';
            } else {
                icon.textContent = 'close';
            }
        }
    }
}

// Initial icon
updateMenuIcon();

// Toggle function dengan animasi
function toggleSidebar() {
    // Efek klik pada button - animasi bounce
    if (menuToggle) {
        menuToggle.style.transform = 'scale(0.92)';
        setTimeout(() => {
            if (menuToggle) menuToggle.style.transform = '';
        }, 150);
    }
    
    // Toggle sidebar
    isSidebarCollapsed = !isSidebarCollapsed;
    
    if (isSidebarCollapsed) {
        if (sidebar) sidebar.classList.add('collapsed');
        localStorage.setItem('sidebarCollapsed', 'true');
    } else {
        if (sidebar) sidebar.classList.remove('collapsed');
        localStorage.setItem('sidebarCollapsed', 'false');
    }
    
    // Update icon
    updateMenuIcon();
    
    // Trigger resize event untuk layout
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 300);
}

// Event listener untuk tombol hamburger
if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });
    
    // Tambahan efek hover
    menuToggle.addEventListener('mouseenter', () => {
        menuToggle.style.transform = 'scale(1.05)';
    });
    
    menuToggle.addEventListener('mouseleave', () => {
        if (menuToggle.style.transform === 'scale(1.05)' || menuToggle.style.transform === 'scale(1.05)') {
            menuToggle.style.transform = '';
        }
    });
}

// Mobile: klik di luar sidebar untuk menutup
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        const isClickInsideSidebar = sidebar && sidebar.contains(e.target);
        const isClickOnMenuToggle = menuToggle && menuToggle.contains(e.target);
        
        if (!isClickInsideSidebar && !isClickOnMenuToggle && sidebar && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            isSidebarCollapsed = true;
            localStorage.setItem('sidebarCollapsed', 'true');
            updateMenuIcon();
        }
    }
});

// ============ PAGE NAVIGATION ============
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('pageTitle');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = item.dataset.page;
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        pages.forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) targetPage.classList.add('active');
        
        let title = '';
        switch(pageId) {
            case 'dashboard': title = 'Dashboard'; break;
            case 'scraper': title = 'Web Scraper'; break;
            case 'upload': title = 'Upload File'; break;
            case 'history': title = 'History'; break;
            case 'github': title = 'GitHub'; break;
            default: title = 'Dashboard';
        }
        if (pageTitle) pageTitle.textContent = title;
        
        if (pageId === 'github') loadFileSelect();
        if (pageId === 'history') loadHistory();
        if (pageId === 'dashboard') {
            updateDashboard();
            loadRatings();
            updateWelcomeStats();
            setTimeout(initScrollReveal, 200);
        }
        if (pageId === 'scraper') displayFileList();
        
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.add('collapsed');
            isSidebarCollapsed = true;
            localStorage.setItem('sidebarCollapsed', 'true');
            updateMenuIcon();
        }
    });
});

// ============ THEME MODE ============
const themeToggle = document.getElementById('theme-toggle');
let currentTheme = localStorage.getItem('theme') || 'light';
let themeStep = parseInt(localStorage.getItem('themeStep') || '0');

function applyTheme(step) {
    document.body.classList.remove('dark-mode', 'black-white');
    if (step === 1) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.checked = true;
    } else if (step === 2) {
        document.body.classList.add('black-white');
        localStorage.setItem('theme', 'black-white');
        if (themeToggle) themeToggle.checked = true;
    } else {
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.checked = false;
    }
    localStorage.setItem('themeStep', step);
}

applyTheme(themeStep);

if (themeToggle) {
    themeToggle.addEventListener('change', () => {
        let currentStep = parseInt(localStorage.getItem('themeStep') || '0');
        let nextStep = (currentStep + 1) % 3;
        applyTheme(nextStep);
    });
}

// ============ WEB SCRAPER ============
const urlInput = document.getElementById('urlInput');
const scrapeBtn = document.getElementById('scrapeBtn');
const scrapingStatus = document.getElementById('scrapingStatus');
const fileListDiv = document.getElementById('fileList');
const customPopup = document.getElementById('customPopup');
const downloadFileBtn = document.getElementById('downloadFileBtn');
let currentDownloadFile = null;

if (scrapeBtn) {
    scrapeBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            scrapingStatus.innerHTML = '<span style="color: #f44336;">⚠️ Please enter a valid URL!</span>';
            return;
        }
        
        scrapingStatus.innerHTML = '<div><span class="material-icons" style="animation: spin 1s linear infinite;">sync</span> Scraping in progress...</div>';
        scrapeBtn.disabled = true;
        
        try {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            const html = data.contents;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const title = doc.querySelector('title')?.innerText || 'No title';
            const metaTags = Array.from(doc.querySelectorAll('meta')).map(m => ({name: m.getAttribute('name') || m.getAttribute('property'), content: m.getAttribute('content')}));
            const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText);
            const links = Array.from(doc.querySelectorAll('a')).map(a => a.href).filter(h => h && h.startsWith('http'));
            const images = Array.from(doc.querySelectorAll('img')).map(img => img.src).filter(s => s && s.startsWith('http'));
            const scripts = Array.from(doc.querySelectorAll('script')).map(s => s.src).filter(s => s);
            const stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
            const paragraphs = Array.from(doc.querySelectorAll('p')).map(p => p.innerText).slice(0, 50);
            const forms = Array.from(doc.querySelectorAll('form')).map(f => ({action: f.action, method: f.method}));
            const media = Array.from(doc.querySelectorAll('iframe, video, audio')).map(m => m.tagName);
            
            const navElements = doc.querySelectorAll('nav a, header a, .menu a, .nav a, .navbar a');
            const menuItems = Array.from(navElements).map(a => ({text: a.innerText.trim(), href: a.href})).filter(m => m.text && m.text.length > 0);
            
            const timestamp = Date.now();
            const fileName = `scrape_${timestamp}.json`;
            const result = {
                url, timestamp, title, metaTags, headings, links, images, scripts,
                stylesheets, paragraphs, forms, media, menuItems, fullHTML: html,
                totalLinks: links.length, totalImages: images.length, totalMenuItems: menuItems.length
            };
            
            localStorage.setItem(fileName, JSON.stringify(result));
            scrapeHistory.unshift({url, timestamp, title, fileName, totalData: result.totalMenuItems});
            if (scrapeHistory.length > 20) scrapeHistory.pop();
            localStorage.setItem('scrapeHistory', JSON.stringify(scrapeHistory));
            
            displayFileList();
            currentDownloadFile = fileName;
            if (customPopup) customPopup.classList.add('show');
            
            scrapingStatus.innerHTML = `<span style="color: #4caf50;">✅ Scraping complete! Found ${menuItems.length} menu items, ${links.length} links, ${images.length} images</span>`;
            updateDashboard();
            loadHistory();
            updateWelcomeStats();
            
        } catch (error) {
            scrapingStatus.innerHTML = `<span style="color: #f44336;">❌ Error: ${error.message}</span>`;
        } finally {
            scrapeBtn.disabled = false;
        }
    });
}

function displayFileList() {
    if (!fileListDiv) return;
    
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('scrape_')) {
            const data = localStorage.getItem(key);
            const size = new Blob([data]).size;
            files.push({name: key, size: `${(size/1024).toFixed(2)} KB`});
        }
    }
    
    if (files.length === 0) {
        fileListDiv.innerHTML = '<p style="text-align: center; padding: 30px;">📭 No files yet. Start scraping!</p>';
    } else {
        fileListDiv.innerHTML = files.map(f => `
            <div class="file-item">
                <span>📄 ${f.name} (${f.size})</span>
                <button onclick="window.downloadFile('${f.name}')" class="btn-secondary">Download</button>
            </div>
        `).join('');
    }
    
    const totalFilesElem = document.getElementById('totalFiles');
    if (totalFilesElem) totalFilesElem.innerText = files.length;
}

window.downloadFile = (fileName) => {
    const data = localStorage.getItem(fileName);
    if (data) {
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`📥 Downloading ${fileName}`);
    }
};

if (downloadFileBtn) {
    downloadFileBtn.addEventListener('click', () => {
        if (currentDownloadFile) {
            window.downloadFile(currentDownloadFile);
            if (customPopup) customPopup.classList.remove('show');
        }
    });
}

const closePopup = document.querySelector('.close-popup');
if (closePopup) {
    closePopup.addEventListener('click', () => {
        if (customPopup) customPopup.classList.remove('show');
    });
}

// ============ HISTORY ============
const historyListDiv = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function loadHistory() {
    if (!historyListDiv) return;
    
    historyListDiv.innerHTML = `
        <div class="skeleton-wrapper">
            <div class="skeleton-history"></div>
            <div class="skeleton-history"></div>
        </div>
    `;
    
    setTimeout(() => {
        if (scrapeHistory.length === 0) {
            historyListDiv.innerHTML = '<p style="text-align: center; padding: 40px;">📭 No scraping history yet. Start scraping!</p>';
        } else {
            historyListDiv.innerHTML = scrapeHistory.map(item => `
                <div class="file-item">
                    <div>
                        <strong>📌 ${escapeHtml(item.title || 'Untitled')}</strong><br>
                        <small>🔗 ${escapeHtml(item.url)} - 📅 ${new Date(item.timestamp).toLocaleString()} - 📊 ${item.totalData || 0} menu items</small>
                    </div>
                    <button onclick="window.downloadFile('${item.fileName}')" class="btn-secondary">Download</button>
                </div>
            `).join('');
        }
    }, 600);
}

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('⚠️ Are you sure you want to clear all history? This cannot be undone!')) {
            scrapeHistory.forEach(item => {
                localStorage.removeItem(item.fileName);
            });
            scrapeHistory = [];
            localStorage.setItem('scrapeHistory', JSON.stringify(scrapeHistory));
            loadHistory();
            displayFileList();
            updateDashboard();
            updateWelcomeStats();
            showToast('🗑️ History berhasil dibersihkan!');
        }
    });
}

// ============ GITHUB UPLOAD ============
const fileSelect = document.getElementById('fileSelect');
const uploadGitHubBtn = document.getElementById('uploadGitHubBtn');
const uploadStatus = document.getElementById('uploadStatus');

function loadFileSelect() {
    if (!fileSelect) return;
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('scrape_')) {
            files.push(key);
        }
    }
    if (files.length === 0) {
        fileSelect.innerHTML = '<option value="">📂 No files available</option>';
    } else {
        fileSelect.innerHTML = '<option value="">📁 Select file to upload</option>' + 
            files.map(f => `<option value="${f}">📄 ${f}</option>`).join('');
    }
}

if (uploadGitHubBtn) {
    uploadGitHubBtn.addEventListener('click', async () => {
        const token = document.getElementById('githubToken').value.trim();
        const repo = document.getElementById('githubRepo').value.trim();
        const fileName = fileSelect.value;
        
        if (!token || !repo || !fileName) {
            uploadStatus.innerHTML = '<span style="color: #f44336;">⚠️ Please fill all fields and select a file!</span>';
            return;
        }
        
        const data = localStorage.getItem(fileName);
        if (!data) {
            uploadStatus.innerHTML = '<span style="color: #f44336;">❌ File not found!</span>';
            return;
        }
        
        uploadStatus.innerHTML = '<div><span class="material-icons" style="animation: spin 1s linear infinite;">sync</span> Uploading to GitHub...</div>';
        uploadGitHubBtn.disabled = true;
        
        try {
            const content = btoa(unescape(encodeURIComponent(data)));
            const response = await fetch(`https://api.github.com/repos/${repo}/contents/${fileName}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Add scraped data: ${fileName}`,
                    content: content
                })
            });
            
            if (response.ok) {
                uploadStatus.innerHTML = '<span style="color: #4caf50;">✅ Successfully uploaded to GitHub!</span>';
                let uploads = parseInt(localStorage.getItem('totalUploads') || '0');
                uploads++;
                localStorage.setItem('totalUploads', uploads);
                updateDashboard();
                updateWelcomeStats();
                showToast('🚀 File berhasil diupload ke GitHub!');
            } else {
                const error = await response.json();
                uploadStatus.innerHTML = `<span style="color: #f44336;">❌ Error: ${error.message}</span>`;
            }
        } catch (error) {
            uploadStatus.innerHTML = `<span style="color: #f44336;">❌ Error: ${error.message}</span>`;
        } finally {
            uploadGitHubBtn.disabled = false;
        }
    });
}

// ============ UPDATE DASHBOARD ============
function updateDashboard() {
    let fileCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i)?.startsWith('scrape_')) fileCount++;
    }
    const totalScrapesElem = document.getElementById('totalScrapes');
    const totalFilesElem = document.getElementById('totalFiles');
    const totalUploadsElem = document.getElementById('totalUploadsFile');
    
    if (totalScrapesElem) totalScrapesElem.innerText = scrapeHistory.length;
    if (totalFilesElem) totalFilesElem.innerText = fileCount;
    if (totalUploadsElem) totalUploadsElem.innerText = uploadHistory.length;
    
    const recentList = document.getElementById('recentList');
    if (recentList) {
        if (scrapeHistory.length === 0) {
            recentList.innerHTML = '<p style="text-align: center; padding: 20px;">📭 No recent activity</p>';
        } else {
            recentList.innerHTML = scrapeHistory.slice(0, 5).map(item => `
                <div class="file-item">
                    <span>🔍 ${escapeHtml(item.title || 'Scrape')} - ${new Date(item.timestamp).toLocaleString()}</span>
                    <button onclick="window.downloadFile('${item.fileName}')" class="btn-secondary" style="padding: 5px 12px; font-size: 12px;">Download</button>
                </div>
            `).join('');
        }
    }
}

// ============ TOAST ============
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (toast) {
        toast.innerHTML = `<span class="material-icons">check_circle</span> ${message}`;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ============ SPIN ANIMATION ============
if (!document.querySelector('#spin-style')) {
    const spinStyle = document.createElement('style');
    spinStyle.id = 'spin-style';
    spinStyle.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(spinStyle);
}

// ============ PIN ACCESS ============
function showPinModal() {
    const modal = document.getElementById('pinModal');
    if (modal) modal.classList.add('show');
}

function hidePinModal() {
    const modal = document.getElementById('pinModal');
    if (modal) modal.classList.remove('show');
}

function verifyPin() {
    const pinInput = document.getElementById('pinInput').value;
    const pinError = document.getElementById('pinError');
    
    if (pinInput === ADMIN_PIN) {
        isAdmin = true;
        localStorage.setItem('isAdmin', 'true');
        hidePinModal();
        showToast('✅ Akses admin diberikan! Sekarang Anda bisa mengganti foto profil.');
        
        const editPhotoBtn = document.getElementById('editPhotoBtn');
        if (editPhotoBtn) editPhotoBtn.style.display = 'flex';
    } else {
        if (pinError) pinError.innerText = '❌ PIN salah! Silakan coba lagi.';
    }
}

const pinAccessBtn = document.getElementById('pinAccessBtn');
if (pinAccessBtn) pinAccessBtn.addEventListener('click', showPinModal);

const submitPinBtn = document.getElementById('submitPinBtn');
if (submitPinBtn) submitPinBtn.addEventListener('click', verifyPin);

const closePinModal = document.getElementById('closePinModal');
if (closePinModal) closePinModal.addEventListener('click', hidePinModal);

const pinInputField = document.getElementById('pinInput');
if (pinInputField) {
    pinInputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPin();
    });
}

// Click outside pin modal
const pinModalEl = document.getElementById('pinModal');
if (pinModalEl) {
    pinModalEl.addEventListener('click', (e) => {
        if (e.target === pinModalEl) hidePinModal();
    });
}

// ============ PROFILE PHOTO ============
function initProfilePhoto() {
    const savedPhoto = localStorage.getItem('profilePhoto');
    const profileImg = document.getElementById('profileImage');
    const editPhotoBtn = document.getElementById('editPhotoBtn');
    
    if (savedPhoto && profileImg) {
        profileImg.src = savedPhoto;
    }
    
    if (editPhotoBtn) {
        editPhotoBtn.style.display = isAdmin ? 'flex' : 'none';
    }
    
    if (editPhotoBtn) {
        editPhotoBtn.addEventListener('click', () => {
            if (!isAdmin) {
                showToast('🔒 Harus login sebagai admin terlebih dahulu! Klik PIN ACCESS');
                showPinModal();
                return;
            }
            const modal = document.getElementById('photoModal');
            if (modal) modal.classList.add('show');
            
            const photoUrlInput = document.getElementById('photoUrlInput');
            const photoPreview = document.getElementById('photoPreview');
            if (photoUrlInput && profileImg) {
                photoUrlInput.value = profileImg.src;
                if (photoPreview) photoPreview.src = profileImg.src;
            }
        });
    }
    
    const savePhotoBtn = document.getElementById('savePhotoBtn');
    if (savePhotoBtn) {
        savePhotoBtn.addEventListener('click', () => {
            const newUrl = document.getElementById('photoUrlInput').value;
            if (profileImg) {
                profileImg.src = newUrl;
                profileImg.style.animation = 'none';
                setTimeout(() => profileImg.style.animation = 'float 3s ease-in-out infinite', 10);
            }
            localStorage.setItem('profilePhoto', newUrl);
            document.getElementById('photoModal').classList.remove('show');
            showToast('📸 Foto profil berhasil diubah!');
        });
    }
    
    const closePhotoModal = document.getElementById('closePhotoModal');
    if (closePhotoModal) {
        closePhotoModal.addEventListener('click', () => {
            document.getElementById('photoModal').classList.remove('show');
        });
    }
    
    const photoModalEl = document.getElementById('photoModal');
    if (photoModalEl) {
        photoModalEl.addEventListener('click', (e) => {
            if (e.target === photoModalEl) photoModalEl.classList.remove('show');
        });
    }
    
    const photoUrlInput = document.getElementById('photoUrlInput');
    if (photoUrlInput) {
        photoUrlInput.addEventListener('input', () => {
            const preview = document.getElementById('photoPreview');
            if (preview) preview.src = photoUrlInput.value;
        });
    }
}

// ============ GET STARTED BUTTON ============
const getStartedBtn = document.getElementById('getStartedBtn');
if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
        const scraperNav = document.querySelector('.nav-item[data-page="scraper"]');
        if (scraperNav) scraperNav.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============ SUBMIT RATING BUTTON ============
const submitRatingBtn = document.getElementById('submitRatingBtn');
if (submitRatingBtn) submitRatingBtn.addEventListener('click', submitRating);

// ============ INITIALIZATION ============
function init() {
    showWelcomeModal();
    loadSteps();
    initProfilePhoto();
    initStarRating();
    loadRatings();
    displayFileList();
    loadHistory();
    updateDashboard();
    loadFileSelect();
    initScrollReveal();
    initUploadSystem();
    
    if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.add('collapsed');
        isSidebarCollapsed = true;
        localStorage.setItem('sidebarCollapsed', 'true');
        updateMenuIcon();
    }
}

// Start the app
init();