// Authentication state
let isAuthenticated = false;
let allScans = [];
let filteredScans = [];
let currentTab = 'all';
let currentView = 'scans';
let allWines = [];
let filteredWines = [];

// Check if already logged in
window.addEventListener('DOMContentLoaded', () => {
    const loggedIn = sessionStorage.getItem('adminLoggedIn');
    if (loggedIn === 'true') {
        showDashboard();
    }
});

// Login form handler
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        errorDiv.textContent = '';
        showDashboard();
    } else {
        errorDiv.textContent = 'Invalid username or password';
    }
});

// Logout
function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('dashboard').classList.remove('active');
    isAuthenticated = false;
}

// Show dashboard and load data
async function showDashboard() {
    isAuthenticated = true;
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    await loadScans();
}

// Load scans from Firestore
async function loadScans() {
    const scansList = document.getElementById('scansList');
    scansList.innerHTML = '<div class="loading">Loading scans...</div>';

    try {
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        allScans = [];

        // For each user, get their scan history
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;

            // Get snap history (wine lists, bottles, shelf, party)
            // Note: Firestore has a default limit - we need to paginate or increase limit
            const snapHistoryRef = db.collection('users').doc(userId).collection('snapHistory');
            const snapSnapshot = await snapHistoryRef.orderBy('timestamp', 'desc').limit(1000).get();

            snapSnapshot.forEach(doc => {
                const data = doc.data();
                allScans.push({
                    id: doc.id,
                    userId: userId,
                    type: data.scanType || 'wine-list',
                    timestamp: data.timestamp?.toDate() || new Date(),
                    status: data.status || 'completed',
                    result: data.preview || data.analysisResult || '', // Use preview field (200 chars)
                    hasError: data.hasError || false,
                    error: data.error || null,
                    usedCache: data.usedCache || null,
                    cacheHitCount: data.cacheHitCount || null,
                    totalWinesScanned: data.totalWinesScanned || null
                });
            });
        }

        // Sort by most recent
        allScans.sort((a, b) => b.timestamp - a.timestamp);

        // Update stats
        updateStats();

        // Apply filters and render
        applyFilters();

    } catch (error) {
        console.error('Error loading scans:', error);
        scansList.innerHTML = `
            <div class="empty-state">
                <p>Error loading scans: ${error.message}</p>
            </div>
        `;
    }
}

// Update statistics
function updateStats() {
    const totalScans = allScans.length;
    const successfulScans = allScans.filter(s =>
        s.status === 'completed' && !s.result.toLowerCase().includes('error')
    ).length;
    const errorScans = allScans.filter(s =>
        s.status === 'error' || s.result.toLowerCase().includes('error')
    ).length;
    const successRate = totalScans > 0 ? Math.round((successfulScans / totalScans) * 100) : 0;

    // Calculate cache statistics
    const scansWithCacheData = allScans.filter(s => s.usedCache !== null && s.usedCache !== undefined);
    const cacheHits = scansWithCacheData.filter(s => s.usedCache === true).length;
    const cacheHitRate = scansWithCacheData.length > 0 ? Math.round((cacheHits / scansWithCacheData.length) * 100) : 0;

    document.getElementById('totalScans').textContent = totalScans;
    document.getElementById('successfulScans').textContent = successfulScans;
    document.getElementById('errorScans').textContent = errorScans;
    document.getElementById('successRate').textContent = successRate + '%';
    document.getElementById('cacheHitRate').textContent = cacheHitRate + '%';
    document.getElementById('cacheHits').textContent = cacheHits;
}

// Switch main views
function switchView(view) {
    currentView = view;
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Show/hide views
    document.getElementById('scansView').style.display = view === 'scans' ? 'block' : 'none';
    document.getElementById('cacheView').style.display = view === 'cache' ? 'block' : 'none';

    // Load cache data if switching to cache view
    if (view === 'cache' && allWines.length === 0) {
        loadWineCache();
    }
}

// Switch scan tabs (within scans view)
function switchScanTab(tab) {
    currentTab = tab;
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    applyFilters();
}

// Apply filters
function applyFilters() {
    const scanTypeFilter = document.getElementById('scanTypeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

    filteredScans = allScans.filter(scan => {
        // Tab filter
        if (currentTab === 'errors') {
            const isError = scan.status === 'error' || scan.result.toLowerCase().includes('error');
            if (!isError) return false;
        }

        // Type filter
        if (scanTypeFilter && scan.type !== scanTypeFilter) return false;

        // Status filter
        if (statusFilter === 'success' && (scan.status === 'error' || scan.result.toLowerCase().includes('error'))) {
            return false;
        }
        if (statusFilter === 'error' && scan.status !== 'error' && !scan.result.toLowerCase().includes('error')) {
            return false;
        }

        // Date filter
        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            const scanDate = new Date(scan.timestamp);
            if (scanDate.toDateString() !== filterDate.toDateString()) return false;
        }

        // Search filter
        if (searchFilter) {
            const searchText = `${scan.result} ${scan.userId} ${scan.type}`.toLowerCase();
            if (!searchText.includes(searchFilter)) return false;
        }

        return true;
    });

    renderScans();
}

// Render scans
function renderScans() {
    const scansList = document.getElementById('scansList');

    if (filteredScans.length === 0) {
        scansList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No scans found</p>
            </div>
        `;
        return;
    }

    scansList.innerHTML = filteredScans.map(scan => {
        const isError = scan.status === 'error' || scan.result.toLowerCase().includes('error');
        const statusClass = isError ? 'error' : 'success';
        const statusText = isError ? 'Error' : 'Success';

        // Cache information
        const hasCacheData = scan.usedCache !== null && scan.usedCache !== undefined;
        const cacheInfo = hasCacheData ? `
            <span class="cache-badge ${scan.usedCache ? 'cache-hit' : 'cache-miss'}">
                ${scan.usedCache ? '⚡ Cache Hit' : '🔄 Cache Miss'}
                ${scan.cacheHitCount !== null && scan.totalWinesScanned !== null ?
                    ` (${scan.cacheHitCount}/${scan.totalWinesScanned} wines)` : ''}
            </span>
        ` : '';

        return `
            <div class="scan-item">
                <div class="scan-header">
                    <div>
                        <span class="scan-type ${scan.type}">${scan.type.replace('-', ' ')}</span>
                        <span class="scan-status ${statusClass}">${statusText}</span>
                        ${cacheInfo}
                    </div>
                    <div class="scan-details">
                        ${formatDate(scan.timestamp)}
                    </div>
                </div>
                <div class="scan-details">
                    <strong>User:</strong> ${scan.userId.substring(0, 8)}...<br>
                    <strong>Scan ID:</strong> ${scan.id}
                </div>
                <div class="scan-response">
                    <div class="response-preview">${escapeHtml(scan.result)}${scan.result.length >= 200 ? '...' : ''}</div>
                    <button class="expand-btn" onclick="toggleFullResponse(this, '${scan.id}')">
                        Show Full Response
                    </button>
                    <div class="response-full" id="full-${scan.id}" style="display: none;"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Helper functions
function formatDate(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function toggleFullResponse(button, scanId) {
    const fullDiv = document.getElementById('full-' + scanId);
    const previewDiv = button.previousElementSibling;

    if (fullDiv.style.display === 'none') {
        // Check if we already loaded the full text
        if (fullDiv.dataset.loaded !== 'true') {
            button.disabled = true;
            button.textContent = 'Loading...';

            try {
                // Fetch full analysis from D1 API
                const response = await fetch(`https://api.sommsnap.com/scans/${scanId}`, {
                    headers: {
                        'x-app-key': 'sommsnap-api-key-2025'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    fullDiv.innerHTML = escapeHtml(data.analysisResult);
                    fullDiv.dataset.loaded = 'true';
                } else {
                    // Fallback: show preview if API fails
                    const scan = allScans.find(s => s.id === scanId);
                    if (scan && scan.result) {
                        fullDiv.innerHTML = escapeHtml(scan.result);
                        fullDiv.dataset.loaded = 'true';
                    } else {
                        fullDiv.innerHTML = '<em>Failed to load full analysis</em>';
                    }
                }
            } catch (error) {
                console.error('Error loading full analysis:', error);
                // Fallback: show preview
                const scan = allScans.find(s => s.id === scanId);
                if (scan && scan.result) {
                    fullDiv.innerHTML = escapeHtml(scan.result);
                    fullDiv.dataset.loaded = 'true';
                } else {
                    fullDiv.innerHTML = '<em>Failed to load full analysis</em>';
                }
            }

            button.disabled = false;
        }

        fullDiv.style.display = 'block';
        previewDiv.style.display = 'none';
        button.textContent = 'Show Less';
    } else {
        fullDiv.style.display = 'none';
        previewDiv.style.display = 'block';
        button.textContent = 'Show Full Response';
    }
}

// Load wine cache from API
async function loadWineCache() {
    const winesList = document.getElementById('winesList');
    winesList.innerHTML = '<div class="loading">Loading wine database...</div>';

    try {
        const response = await fetch('https://api.sommsnap.com/wine-cache/all', {
            headers: {
                'x-app-key': 'sommsnap-api-key-2025'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        allWines = data.wines || [];
        filteredWines = allWines;
        renderWines();

    } catch (error) {
        console.error('Error loading wine cache:', error);
        winesList.innerHTML = `
            <div class="empty-state">
                <p>Error loading wine database: ${error.message}</p>
                <p style="font-size: 14px; margin-top: 10px;">Endpoint: /wine-cache/all</p>
            </div>
        `;
    }
}

// Search wines
function searchWines() {
    const searchTerm = document.getElementById('wineSearchInput').value.toLowerCase();

    if (!searchTerm) {
        filteredWines = allWines;
    } else {
        filteredWines = allWines.filter(wine => {
            const searchText = `${wine.name} ${wine.producer || ''} ${wine.region || ''} ${wine.varietal || ''}`.toLowerCase();
            return searchText.includes(searchTerm);
        });
    }

    renderWines();
}

// Render wines
function renderWines() {
    const winesList = document.getElementById('winesList');

    if (filteredWines.length === 0) {
        winesList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>${allWines.length === 0 ? 'Wine database is empty' : 'No wines match your search'}</p>
            </div>
        `;
        return;
    }

    winesList.innerHTML = `
        <div style="margin-bottom: 15px; color: #666;">
            Showing ${filteredWines.length} of ${allWines.length} wines
        </div>
        ${filteredWines.map(wine => {
            return `
                <div class="scan-item">
                    <div class="scan-header">
                        <div>
                            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">
                                ${escapeHtml(wine.name || 'Unknown Wine')}
                            </h3>
                        </div>
                        <div class="scan-details">
                            <strong>Scans:</strong> ${wine.scan_count || 0}
                        </div>
                    </div>
                    <div class="scan-details">
                        ${wine.producer ? `<strong>Producer:</strong> ${escapeHtml(wine.producer)}<br>` : ''}
                        ${wine.region ? `<strong>Region:</strong> ${escapeHtml(wine.region)}<br>` : ''}
                        ${wine.varietal ? `<strong>Varietal:</strong> ${escapeHtml(wine.varietal)}<br>` : ''}
                        ${wine.vintage ? `<strong>Vintage:</strong> ${wine.vintage}<br>` : ''}
                        ${wine.verification_status ? `<strong>Status:</strong> ${wine.verification_status}<br>` : ''}
                    </div>
                    ${wine.tasting_notes ? `
                        <div class="scan-response">
                            <strong>Tasting Notes:</strong><br>
                            ${escapeHtml(wine.tasting_notes.substring(0, 300))}${wine.tasting_notes.length > 300 ? '...' : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('')}
    `;
}
