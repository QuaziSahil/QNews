/* ========================================
   Q NEWS - Main Application Script
   RSS Fetching, AI Summarization, Geolocation
   ======================================== */

// Configuration
const CONFIG = {
    corsProxy: 'https://api.allorigins.win/raw?url=',
    feeds: {
        tech: 'https://feeds.feedburner.com/TechCrunch',
        world: 'https://feeds.bbci.co.uk/news/world/rss.xml',
        sports: 'https://feeds.bbci.co.uk/sport/rss.xml',
        entertainment: 'https://www.theverge.com/rss/index.xml',
        science: 'https://www.sciencedaily.com/rss/all.xml',
        business: 'https://feeds.bbci.co.uk/news/business/rss.xml'
    },
    defaultImages: {
        tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
        world: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
        sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600',
        entertainment: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=600',
        science: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600',
        business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600'
    },
    articlesPerPage: 12,
    cacheDuration: 5 * 60 * 1000 // 5 minutes
};

// State
let allArticles = [];
let displayedArticles = 0;
let currentCategory = 'all';
let userLocation = null;
let isLoading = false;

// DOM Elements
const elements = {
    preloader: document.getElementById('preloader'),
    newsGrid: document.getElementById('newsGrid'),
    trendingCarousel: document.getElementById('trendingCarousel'),
    localNewsGrid: document.getElementById('localNewsGrid'),
    locationTitle: document.getElementById('locationTitle'),
    locationBtn: document.getElementById('locationBtn'),
    refreshLocal: document.getElementById('refreshLocal'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    themeBtn: document.getElementById('themeBtn'),
    totalArticles: document.getElementById('totalArticles'),
    navToggle: document.getElementById('navToggle'),
    particles: document.getElementById('particles')
};

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    initParticles();
    initTheme();
    initNavigation();
    initScrollAnimations();
    initCategoryCards();
    initFilterTabs();

    await loadAllFeeds();
    hidePreloader();
});

// ========================================
// Preloader
// ========================================

function hidePreloader() {
    setTimeout(() => {
        elements.preloader?.classList.add('hidden');
    }, 1500);
}

// ========================================
// Particles Background
// ========================================

function initParticles() {
    if (!elements.particles) return;

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particle.style.animationDuration = `${10 + Math.random() * 10}s`;

        const colors = ['#6366f1', '#ec4899', '#06b6d4', '#10b981'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        elements.particles.appendChild(particle);
    }
}

// ========================================
// Theme Toggle
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem('qnews-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    elements.themeBtn?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('qnews-theme', newTheme);
    });
}

// ========================================
// Navigation
// ========================================

function initNavigation() {
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            setActiveCategory(category);
        });
    });

    // Mobile toggle
    elements.navToggle?.addEventListener('click', () => {
        document.querySelector('.nav-links')?.classList.toggle('mobile-open');
    });

    // Location button
    elements.locationBtn?.addEventListener('click', requestLocation);
    elements.refreshLocal?.addEventListener('click', loadLocalNews);

    // Load more button
    elements.loadMoreBtn?.addEventListener('click', loadMoreArticles);

    // Carousel controls
    document.getElementById('trendingPrev')?.addEventListener('click', () => scrollCarousel(-1));
    document.getElementById('trendingNext')?.addEventListener('click', () => scrollCarousel(1));
}

function setActiveCategory(category) {
    currentCategory = category;

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.category === category);
    });

    displayedArticles = 0;
    renderNewsGrid();
}

function scrollCarousel(direction) {
    const carousel = elements.trendingCarousel;
    if (!carousel) return;

    const scrollAmount = 420;
    carousel.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
}

// ========================================
// Scroll Animations
// ========================================

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        observer.observe(el);
    });
}

// ========================================
// Category Cards
// ========================================

function initCategoryCards() {
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            setActiveCategory(category);

            // Scroll to news feed
            document.querySelector('.news-feed')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ========================================
// Filter Tabs
// ========================================

function initFilterTabs() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.filter;
            filterArticles(filter);
        });
    });
}

function filterArticles(filter) {
    let filtered = [...allArticles];

    if (filter === 'today') {
        const today = new Date().toDateString();
        filtered = filtered.filter(a => new Date(a.pubDate).toDateString() === today);
    } else if (filter === 'popular') {
        // Simulate popularity by shuffling
        filtered = filtered.sort(() => Math.random() - 0.5);
    }

    displayedArticles = 0;
    renderNewsGrid(filtered);
}

// ========================================
// RSS Feed Fetching
// ========================================

async function loadAllFeeds() {
    isLoading = true;
    showLoadingState();

    try {
        const feedPromises = Object.entries(CONFIG.feeds).map(([category, url]) =>
            fetchFeed(url, category)
        );

        const results = await Promise.allSettled(feedPromises);

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allArticles.push(...result.value);
            }
        });

        // Sort by date
        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // Update stats
        if (elements.totalArticles) {
            animateNumber(elements.totalArticles, allArticles.length);
        }

        renderTrendingCarousel();
        renderNewsGrid();

    } catch (error) {
        console.error('Error loading feeds:', error);
        showError('Failed to load news. Please try again.');
    }

    isLoading = false;
}

async function fetchFeed(url, category) {
    try {
        const response = await fetch(CONFIG.corsProxy + encodeURIComponent(url));
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');

        const items = xml.querySelectorAll('item');
        const articles = [];

        items.forEach((item, index) => {
            if (index >= 20) return; // Limit per feed

            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();

            // Try to extract image
            let image = '';
            const mediaContent = item.querySelector('content, media\\:content, enclosure');
            if (mediaContent) {
                image = mediaContent.getAttribute('url') || '';
            }

            // Fallback to default image
            if (!image) {
                image = CONFIG.defaultImages[category];
            }

            articles.push({
                id: `${category}-${index}-${Date.now()}`,
                title: cleanText(title),
                description: cleanText(description),
                link,
                pubDate,
                image,
                category,
                source: getSourceName(url),
                summarized: false
            });
        });

        return articles;

    } catch (error) {
        console.error(`Error fetching ${category}:`, error);
        return [];
    }
}

// ========================================
// AI Summarization (Puter.js)
// ========================================

async function summarizeArticle(article) {
    if (article.summarized || !article.description) return article;

    try {
        // Check if Puter is available
        if (typeof puter === 'undefined' || !puter.ai) {
            // Fallback: simple truncation
            article.summary = truncateText(article.description, 150);
            return article;
        }

        const prompt = `Summarize this news in 2 punchy, engaging sentences (max 100 words): "${article.description}"`;

        const response = await puter.ai.chat(prompt, {
            model: 'gpt-4o-mini'
        });

        article.summary = response || truncateText(article.description, 150);
        article.summarized = true;

    } catch (error) {
        console.error('AI summarization failed:', error);
        article.summary = truncateText(article.description, 150);
    }

    return article;
}

// ========================================
// Rendering Functions
// ========================================

function renderTrendingCarousel() {
    if (!elements.trendingCarousel) return;

    const trending = allArticles.slice(0, 8);

    elements.trendingCarousel.innerHTML = trending.map((article, index) => `
        <article class="trending-card" onclick="openArticle('${article.link}')">
            <img src="${article.image}" alt="${article.title}" class="trending-card-bg" 
                 onerror="this.src='${CONFIG.defaultImages[article.category]}'">
            <div class="trending-card-overlay"></div>
            <div class="trending-card-rank">${index + 1}</div>
            <div class="trending-card-content">
                <span class="trending-card-category">${article.category}</span>
                <h3 class="trending-card-title">${article.title}</h3>
                <div class="trending-card-meta">
                    <span>${article.source}</span>
                    <span>•</span>
                    <span>${getTimeAgo(article.pubDate)}</span>
                </div>
            </div>
        </article>
    `).join('');
}

function renderNewsGrid(articles = null) {
    if (!elements.newsGrid) return;

    let source = articles || allArticles;

    // Filter by category
    if (currentCategory !== 'all') {
        source = source.filter(a => a.category === currentCategory);
    }

    const toShow = source.slice(displayedArticles, displayedArticles + CONFIG.articlesPerPage);
    displayedArticles += toShow.length;

    if (displayedArticles === toShow.length) {
        elements.newsGrid.innerHTML = '';
    }

    toShow.forEach(async (article, index) => {
        // Summarize with AI
        await summarizeArticle(article);

        const card = createNewsCard(article, index);
        elements.newsGrid.appendChild(card);

        // Trigger reveal animation
        setTimeout(() => card.classList.add('visible'), index * 100);
    });

    // Hide load more if no more articles
    if (elements.loadMoreBtn) {
        elements.loadMoreBtn.style.display = displayedArticles >= source.length ? 'none' : 'flex';
    }
}

function createNewsCard(article, index) {
    const card = document.createElement('article');
    card.className = 'news-card reveal';
    card.style.transitionDelay = `${index * 0.1}s`;
    card.onclick = () => openArticle(article.link);

    card.innerHTML = `
        <div class="news-card-image">
            <img src="${article.image}" alt="${article.title}" 
                 onerror="this.src='${CONFIG.defaultImages[article.category]}'" loading="lazy">
            <span class="news-card-category">${article.category}</span>
        </div>
        <div class="news-card-content">
            <div class="news-card-meta">
                <span class="news-card-source">${article.source}</span>
                <span class="news-card-time">${getTimeAgo(article.pubDate)}</span>
                ${article.summarized ? '<span class="ai-badge">AI Summary</span>' : ''}
            </div>
            <h3 class="news-card-title">${article.title}</h3>
            <p class="news-card-summary">${article.summary || truncateText(article.description, 120)}</p>
        </div>
        <div class="news-card-footer">
            <div class="news-card-tags">
                <span class="news-tag">${article.category}</span>
            </div>
            <span class="news-card-read">
                Read More
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </span>
        </div>
    `;

    return card;
}

function loadMoreArticles() {
    renderNewsGrid();
}

// ========================================
// Geolocation & Local News
// ========================================

async function requestLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000
            });
        });

        userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        // Get location name via reverse geocoding
        await getLocationName();
        await loadLocalNews();

    } catch (error) {
        console.error('Geolocation error:', error);
        showError('Could not get your location. Please check permissions.');
    }
}

async function getLocationName() {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${userLocation.lat}&lon=${userLocation.lng}&format=json`
        );
        const data = await response.json();

        const city = data.address?.city || data.address?.town || data.address?.village || 'Your Area';
        const country = data.address?.country || '';

        if (elements.locationTitle) {
            elements.locationTitle.textContent = `News from ${city}`;
        }

        userLocation.name = city;
        userLocation.country = country;

    } catch (error) {
        console.error('Reverse geocoding failed:', error);
    }
}

async function loadLocalNews() {
    if (!elements.localNewsGrid) return;

    // For now, show random selection since we don't have true local news feeds
    // In production, you'd use a location-based news API
    const localArticles = allArticles
        .filter(a => a.category === 'world')
        .slice(0, 6);

    elements.localNewsGrid.innerHTML = localArticles.map(article => `
        <article class="local-card" onclick="openArticle('${article.link}')">
            <div class="local-card-image">
                <img src="${article.image}" alt="${article.title}"
                     onerror="this.src='${CONFIG.defaultImages.world}'" loading="lazy">
            </div>
            <div class="local-card-content">
                <h4 class="local-card-title">${article.title}</h4>
                <span class="local-card-meta">${article.source} • ${getTimeAgo(article.pubDate)}</span>
            </div>
        </article>
    `).join('');
}

// ========================================
// Utility Functions
// ========================================

function openArticle(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function getSourceName(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() +
            hostname.replace('www.', '').split('.')[0].slice(1);
    } catch {
        return 'News';
    }
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function animateNumber(element, target) {
    let current = 0;
    const increment = Math.ceil(target / 30);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = current;
    }, 30);
}

// ========================================
// Loading & Error States
// ========================================

function showLoadingState() {
    if (!elements.newsGrid) return;

    elements.newsGrid.innerHTML = Array(6).fill(0).map(() => `
        <div class="news-card">
            <div class="skeleton skeleton-image"></div>
            <div style="padding: 1rem;">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text" style="width: 60%"></div>
            </div>
        </div>
    `).join('');
}

function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <span>${message}</span>
    `;

    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 5000);
}

// ========================================
// Export for global access
// ========================================

window.openArticle = openArticle;
