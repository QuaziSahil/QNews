/* ========================================
   Q NEWS - Main Application Script
   Optimized: Faster loading, Working AI, Shareable URLs
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
    categoryImages: {
        tech: [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600',
            'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600'
        ],
        world: [
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
            'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600',
            'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600',
            'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600'
        ],
        sports: [
            'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600',
            'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600',
            'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600',
            'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600'
        ],
        entertainment: [
            'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=600',
            'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600',
            'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600'
        ],
        science: [
            'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600',
            'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600'
        ],
        business: [
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600',
            'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=600'
        ]
    },
    articlesPerPage: 12
};

// State
let allArticles = [];
let articlesMap = new Map();
let displayedArticles = 0;
let currentCategory = 'all';
let userLocation = null;
let isLoading = false;
let puterReady = false; // Track Puter.js status

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
    createArticleModal();
    initParticles();
    initTheme();
    initNavigation();
    initScrollAnimations();
    initCategoryCards();
    initFilterTabs();
    initRouter();

    // Check Puter.js availability
    checkPuterReady();

    await loadAllFeeds();
    hidePreloader();

    // Check if URL has article ID
    handleRouteChange();
});

// ========================================
// URL Routing (Shareable Links)
// ========================================

function initRouter() {
    window.addEventListener('popstate', handleRouteChange);
}

function handleRouteChange() {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('article');

    if (articleId && articlesMap.has(articleId)) {
        openArticleModal(articleId, false); // Don't push state again
    }
}

function updateURL(articleId) {
    const url = new URL(window.location);
    if (articleId) {
        url.searchParams.set('article', articleId);
    } else {
        url.searchParams.delete('article');
    }
    window.history.pushState({}, '', url);
}

// ========================================
// Puter.js Check
// ========================================

function checkPuterReady() {
    if (typeof puter !== 'undefined' && puter.ai) {
        puterReady = true;
        console.log('✅ Puter.js AI is ready');
    } else {
        console.log('⚠️ Puter.js not available, using fallback');
        puterReady = false;
    }
}

// ========================================
// Article Modal
// ========================================

function createArticleModal() {
    const modal = document.createElement('div');
    modal.id = 'articleModal';
    modal.className = 'article-modal';
    modal.innerHTML = `
        <button class="article-close" onclick="closeArticleModal()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
        </button>
        <div class="article-modal-content" id="articleModalContent">
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeArticleModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeArticleModal();
    });
}

async function openArticleModal(articleId, pushState = true) {
    const article = articlesMap.get(articleId);
    if (!article) return;

    const modal = document.getElementById('articleModal');
    const content = document.getElementById('articleModalContent');

    // Update URL for sharing
    if (pushState) {
        updateURL(articleId);
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Build shareable URL
    const shareUrl = `${window.location.origin}${window.location.pathname}?article=${articleId}`;

    content.innerHTML = `
        <div class="article-header">
            <span class="article-category">${article.category}</span>
            <h1 class="article-title">${article.title}</h1>
            <div class="article-meta">
                <span class="article-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    ${getTimeAgo(article.pubDate)}
                </span>
                <span class="article-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    ${article.source}
                </span>
            </div>
        </div>
        
        <img src="${article.image}" alt="${article.title}" class="article-image" 
             onerror="this.src='${getRandomImage(article.category)}'">
        
        <div class="article-ai-summary" id="aiSummaryBox">
            <div class="ai-summary-header">
                <span class="ai-summary-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    AI SUMMARY
                </span>
            </div>
            <p class="ai-summary-text" id="aiSummaryText">
                <span class="ai-summary-loading">
                    <span class="loading-spinner"></span>
                    Generating AI-powered summary...
                </span>
            </p>
        </div>
        
        <div class="article-body">
            <h4 style="color: var(--accent-tertiary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Original Content
            </h4>
            <p>${article.description || 'Full article content available at the source.'}</p>
        </div>
        
        <div class="article-footer">
            <button class="article-source-btn" onclick="window.open('${article.link}', '_blank')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Read Full Article at Source
            </button>
            <div class="article-share-btns">
                <button class="share-btn" onclick="shareArticle('twitter', '${encodeURIComponent(article.title)}', '${encodeURIComponent(shareUrl)}')" title="Share on X">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                </button>
                <button class="share-btn" onclick="shareArticle('linkedin', '${encodeURIComponent(article.title)}', '${encodeURIComponent(shareUrl)}')" title="Share on LinkedIn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                </button>
                <button class="share-btn" onclick="copyToClipboard('${shareUrl}')" title="Copy Shareable Link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Generate AI summary asynchronously
    generateAISummary(article);
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    updateURL(null); // Clear article from URL
}

async function generateAISummary(article) {
    const summaryEl = document.getElementById('aiSummaryText');
    const summaryBox = document.getElementById('aiSummaryBox');

    if (!summaryEl) return;

    try {
        // Check if Puter is ready
        if (!puterReady) {
            // Check again in case it loaded late
            if (typeof puter !== 'undefined' && puter.ai) {
                puterReady = true;
            }
        }

        if (!puterReady) {
            // Fallback: Create a smart excerpt
            summaryEl.innerHTML = `
                <span style="opacity: 0.7; font-size: 0.875rem;">⚠️ AI temporarily unavailable</span><br><br>
                ${article.description || 'No summary available.'}
            `;
            return;
        }

        // Generate AI summary with Puter.js
        const prompt = `You are a professional news editor. Create a compelling 2-3 sentence summary of this news article. Make it engaging and informative. Do NOT repeat the title.

Title: ${article.title}
Content: ${article.description}

Write only the summary, nothing else:`;

        console.log('🤖 Generating AI summary...');

        const summary = await puter.ai.chat(prompt, {
            model: 'gpt-4o-mini'
        });

        if (summary && summary.trim().length > 0) {
            summaryEl.innerHTML = `
                <span style="font-size: 1.1rem; line-height: 1.7;">${summary}</span>
            `;
            summaryBox.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            console.log('✅ AI summary generated successfully');
        } else {
            throw new Error('Empty response');
        }

    } catch (error) {
        console.error('❌ AI generation failed:', error);
        summaryEl.innerHTML = `
            <span style="opacity: 0.7; font-size: 0.875rem;">Could not generate AI summary</span><br><br>
            ${article.description || 'Full article available at source.'}
        `;
    }
}

function shareArticle(platform, title, url) {
    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    };
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('🔗 Link copied! You can now share this article.', 'success');
    }).catch(() => {
        showToast('Failed to copy link', 'error');
    });
}

// ========================================
// Preloader
// ========================================

function hidePreloader() {
    setTimeout(() => {
        elements.preloader?.classList.add('hidden');
    }, 800); // Reduced from 1500ms
}

// ========================================
// Particles Background
// ========================================

function initParticles() {
    if (!elements.particles) return;

    const particleCount = 20; // Reduced for performance

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
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            setActiveCategory(category);
        });
    });

    elements.navToggle?.addEventListener('click', () => {
        document.querySelector('.nav-links')?.classList.toggle('mobile-open');
    });

    elements.locationBtn?.addEventListener('click', requestLocation);
    elements.refreshLocal?.addEventListener('click', loadLocalNews);
    elements.loadMoreBtn?.addEventListener('click', loadMoreArticles);

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
        filtered = filtered.sort(() => Math.random() - 0.5);
    }

    displayedArticles = 0;
    renderNewsGrid(filtered);
}

// ========================================
// RSS Feed Fetching (Optimized)
// ========================================

async function loadAllFeeds() {
    isLoading = true;
    showLoadingState();

    try {
        // Load feeds in parallel with timeout
        const feedPromises = Object.entries(CONFIG.feeds).map(([category, url]) =>
            Promise.race([
                fetchFeed(url, category),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 8000))
            ]).catch(err => {
                console.warn(`Feed ${category} failed:`, err);
                return [];
            })
        );

        const results = await Promise.all(feedPromises);

        results.forEach(feedArticles => {
            if (Array.isArray(feedArticles)) {
                allArticles.push(...feedArticles);
            }
        });

        // Sort by date
        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // Store in map for quick lookup
        allArticles.forEach(article => {
            articlesMap.set(article.id, article);
        });

        if (elements.totalArticles) {
            animateNumber(elements.totalArticles, allArticles.length);
        }

        renderTrendingCarousel();
        renderNewsGrid();

    } catch (error) {
        console.error('Error loading feeds:', error);
        showError('Failed to load news. Please refresh the page.');
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
            if (index >= 15) return; // Reduced for faster loading

            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();

            let image = extractImage(item, text);

            if (!image) {
                image = getRandomImage(category);
            }

            // Create simple, stable ID
            const articleId = `${category}-${index}`;

            articles.push({
                id: articleId,
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

function extractImage(item, rawText) {
    // Try multiple methods
    const mediaContent = item.querySelector('content');
    if (mediaContent?.getAttribute('url')) {
        return mediaContent.getAttribute('url');
    }

    const thumbnail = item.querySelector('thumbnail');
    if (thumbnail?.getAttribute('url')) {
        return thumbnail.getAttribute('url');
    }

    const enclosure = item.querySelector('enclosure');
    if (enclosure?.getAttribute('url') && enclosure.getAttribute('type')?.includes('image')) {
        return enclosure.getAttribute('url');
    }

    const description = item.querySelector('description')?.textContent || '';
    const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) {
        return imgMatch[1];
    }

    const contentEncoded = item.querySelector('encoded')?.textContent || '';
    const contentImgMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (contentImgMatch?.[1]) {
        return contentImgMatch[1];
    }

    return null;
}

function getRandomImage(category) {
    const images = CONFIG.categoryImages[category] || CONFIG.categoryImages.world;
    return images[Math.floor(Math.random() * images.length)];
}

// ========================================
// Rendering Functions (No AI on cards for speed)
// ========================================

function renderTrendingCarousel() {
    if (!elements.trendingCarousel) return;

    const trending = allArticles.slice(0, 8);

    elements.trendingCarousel.innerHTML = trending.map((article, index) => `
        <article class="trending-card" onclick="openArticleModal('${article.id}')">
            <img src="${article.image}" alt="${article.title}" class="trending-card-bg" 
                 onerror="this.src='${getRandomImage(article.category)}'">
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

    if (currentCategory !== 'all') {
        source = source.filter(a => a.category === currentCategory);
    }

    const toShow = source.slice(displayedArticles, displayedArticles + CONFIG.articlesPerPage);
    displayedArticles += toShow.length;

    if (displayedArticles === toShow.length) {
        elements.newsGrid.innerHTML = '';
    }

    // Render cards immediately without waiting for AI
    toShow.forEach((article, index) => {
        const card = createNewsCard(article, index);
        elements.newsGrid.appendChild(card);
        setTimeout(() => card.classList.add('visible'), index * 50);
    });

    if (elements.loadMoreBtn) {
        elements.loadMoreBtn.style.display = displayedArticles >= source.length ? 'none' : 'flex';
    }
}

function createNewsCard(article, index) {
    const card = document.createElement('article');
    card.className = 'news-card reveal';
    card.style.transitionDelay = `${index * 0.05}s`;
    card.onclick = () => openArticleModal(article.id);

    card.innerHTML = `
        <div class="news-card-image">
            <img src="${article.image}" alt="${article.title}" 
                 onerror="this.src='${getRandomImage(article.category)}'" loading="lazy">
            <span class="news-card-category">${article.category}</span>
        </div>
        <div class="news-card-content">
            <div class="news-card-meta">
                <span class="news-card-source">${article.source}</span>
                <span class="news-card-time">${getTimeAgo(article.pubDate)}</span>
            </div>
            <h3 class="news-card-title">${article.title}</h3>
            <p class="news-card-summary">${truncateText(article.description, 120)}</p>
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

        if (elements.locationTitle) {
            elements.locationTitle.textContent = `News from ${city}`;
        }

        userLocation.name = city;

    } catch (error) {
        console.error('Reverse geocoding failed:', error);
    }
}

async function loadLocalNews() {
    if (!elements.localNewsGrid) return;

    const localArticles = allArticles
        .filter(a => a.category === 'world')
        .slice(0, 6);

    elements.localNewsGrid.innerHTML = localArticles.map(article => `
        <article class="local-card" onclick="openArticleModal('${article.id}')">
            <div class="local-card-image">
                <img src="${article.image}" alt="${article.title}"
                     onerror="this.src='${getRandomImage('world')}'" loading="lazy">
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

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '')
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
    const increment = Math.ceil(target / 20);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = current;
    }, 20);
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
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
        error: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
    };

    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${icons[type] || icons.info}
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

    setTimeout(() => toast.remove(), 4000);
}

// ========================================
// Global Functions
// ========================================

window.openArticleModal = openArticleModal;
window.closeArticleModal = closeArticleModal;
window.shareArticle = shareArticle;
window.copyToClipboard = copyToClipboard;
