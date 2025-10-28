// Authentication state
let isAuthenticated = false;
let allScans = [];
let filteredScans = [];

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
        console.log('📊 Loading scans from Firestore...');
        console.log('Database object:', db);

        // Get all users
        const usersSnapshot = await db.collection('users').get();
        console.log(`Found ${usersSnapshot.size} users`);

        // Log user IDs for debugging
        if (usersSnapshot.size > 0) {
            console.log('User IDs:', usersSnapshot.docs.map(d => d.id));
        }

        allScans = [];

        // For each user, get their scan history
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;

            // Get snap history (wine lists, bottles, shelf, party)
            const snapHistoryRef = db.collection('users').doc(userId).collection('snapHistory');
            const snapSnapshot = await snapHistoryRef.orderBy('timestamp', 'desc').limit(100).get();

            console.log(`User ${userId}: Found ${snapSnapshot.size} scans`);

            snapSnapshot.forEach(doc => {
                const data = doc.data();

                // Determine scan type from result content or default to wine-list
                let scanType = 'wine-list';
                const result = data.analysisResult || '';
                if (result.toLowerCase().includes('party') || result.toLowerCase().includes('ranking')) {
                    scanType = 'party';
                } else if (result.toLowerCase().includes('shelf') || result.toLowerCase().includes('wine shop')) {
                    scanType = 'shelf';
                } else if (result.toLowerCase().includes('bottle') && !result.toLowerCase().includes('menu')) {
                    scanType = 'bottle';
                }

                allScans.push({
                    id: doc.id,
                    userId: userId,
                    type: scanType,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    status: data.status || 'completed',
                    result: result,
                    error: data.error || null
                });
            });
        }

        // Sort by most recent
        allScans.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`✅ Loaded ${allScans.length} total scans`);

        // Update stats
        updateStats();

        // Apply filters and render
        applyFilters();

    } catch (error) {
        console.error('❌ Error loading scans:', error);
        console.error('Error details:', error.code, error.message);

        let errorMsg = error.message;
        if (error.code === 'permission-denied') {
            errorMsg = 'Permission denied. Check Firestore security rules to allow reading from the admin dashboard.';
        }

        scansList.innerHTML = `
            <div class="empty-state">
                <p style="color: #e53e3e;">Error loading scans</p>
                <p style="font-size: 14px; color: #666;">${errorMsg}</p>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">Check browser console for details</p>
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

    document.getElementById('totalScans').textContent = totalScans;
    document.getElementById('successfulScans').textContent = successfulScans;
    document.getElementById('errorScans').textContent = errorScans;
    document.getElementById('successRate').textContent = successRate + '%';
}

// Apply filters
function applyFilters() {
    const scanTypeFilter = document.getElementById('scanTypeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

    filteredScans = allScans.filter(scan => {
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

        return `
            <div class="scan-item">
                <div class="scan-header">
                    <div>
                        <span class="scan-type ${scan.type}">${scan.type.replace('-', ' ')}</span>
                        <span class="scan-status ${statusClass}">${statusText}</span>
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
                    ${escapeHtml(scan.result.substring(0, 500))}${scan.result.length > 500 ? '...' : ''}
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
