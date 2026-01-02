/* ========================================
   Q NEWS - Main Application Script
   Indian News Focus with RSS Feeds
   ======================================== */

// Configuration
const CONFIG = {
    corsProxies: [
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://thingproxy.freeboard.io/fetch/'
    ],
    currentProxyIndex: 0,
    feeds: {
        // Indian News Sources
        general: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
        technology: 'https://feeds.feedburner.com/gadgets360-latest',
        sports: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms',
        entertainment: 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms',
        business: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
        science: 'https://www.sciencedaily.com/rss/all.xml'
    },
    categoryImages: {
        general: [
            'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800',
            'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800',
            'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800'
        ],
        technology: [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
            'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800'
        ],
        sports: [
            'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
            'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',
            'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800'
        ],
        entertainment: [
            'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800',
            'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
            'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800'
        ],
        science: [
            'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800',
            'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800'
        ],
        business: [
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800'
        ]
    },
    articlesPerPage: 15
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

    // Generate smart summary and tags
    const summary = createSmartSummary(article.description, article.title);
    const tags = extractTags(article.title, article.description, article.category);
    const readTime = Math.max(1, Math.ceil((article.description?.split(' ').length || 50) / 200));

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
        
        <!-- Gorgeous Share Card for Social Media -->
        <div class="share-card-wrapper">
            <div class="share-card" id="shareCard">
                <div class="share-card-decoration decoration-1"></div>
                <div class="share-card-decoration decoration-2"></div>
                
                <!-- Hero Image with Overlay (will be updated with og:image) -->
                <div class="share-card-hero">
                    <img id="shareCardImage" src="${article.image}" alt="${article.title}" 
                         onerror="this.src='${getRandomImage(article.category)}'" crossorigin="anonymous">
                    <div class="share-card-hero-branding">
                        <div class="share-card-logo">
                            <div class="logo-icon">Q</div>
                            <span class="logo-text">NEWS</span>
                        </div>
                        <span class="share-card-category ${article.category}">${article.category.toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="share-card-content">
                    <h2 class="share-card-title">${article.title}</h2>
                    
                    <div class="share-card-insight">
                        <div class="insight-label">Key Insight</div>
                        <div class="insight-text">${summary}</div>
                    </div>
                    
                    ${article.bulletPoints && article.bulletPoints.length > 0 ? `
                    <div class="share-card-bullets">
                        <ul class="bullets-list">
                            ${article.bulletPoints.slice(0, 2).map(point => `<li>${truncateText(point, 80)}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
                </div>
                
                <div class="share-card-footer">
                    <div class="share-card-meta">
                        <span class="meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                            ${readTime} min read
                        </span>
                        <span class="meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            ${new Date(article.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                    <span class="share-card-source">via ${article.source}</span>
                </div>
            </div>
            
            <button class="download-card-btn" onclick="downloadShareCard('${article.id}')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Card
            </button>
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

    // Fetch and update the share card image with the real og:image from article source
    updateShareCardImage(article);
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    updateURL(null); // Clear article from URL
}

// Fetch the actual og:image from article source for accurate share card images
async function fetchArticleOGImage(articleUrl, articleCategory) {
    try {
        // Use the first working proxy
        const proxy = CONFIG.corsProxies[0];
        const proxyUrl = proxy + encodeURIComponent(articleUrl);

        const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
            console.warn('OG fetch failed, using fallback');
            return null;
        }

        const html = await response.text();

        // Extract og:image from HTML
        const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

        if (ogImageMatch && ogImageMatch[1]) {
            let ogImage = ogImageMatch[1];
            // Ensure full URL
            if (ogImage.startsWith('//')) {
                ogImage = 'https:' + ogImage;
            } else if (!ogImage.startsWith('http')) {
                // Relative URL - try to make absolute
                const urlObj = new URL(articleUrl);
                ogImage = urlObj.origin + ogImage;
            }
            console.log('✅ Found og:image:', ogImage);
            return ogImage;
        }

        // Fallback: try twitter:image
        const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
        if (twitterImageMatch && twitterImageMatch[1]) {
            console.log('✅ Found twitter:image:', twitterImageMatch[1]);
            return twitterImageMatch[1];
        }

    } catch (error) {
        console.warn('OG image fetch error:', error.message);
    }

    return null;
}

// Update share card image with real og:image (called after modal opens)
async function updateShareCardImage(article) {
    const imgElement = document.getElementById('shareCardImage');
    if (!imgElement || !article.link) return;

    const ogImage = await fetchArticleOGImage(article.link, article.category);
    if (ogImage) {
        imgElement.src = ogImage;
        // Also update the article object so download uses this image
        article.image = ogImage;
    }
}

async function generateAISummary(article) {
    const summaryEl = document.getElementById('aiSummaryText');
    const summaryBox = document.getElementById('aiSummaryBox');

    if (!summaryEl) return;

    try {
        // Generate smart summary locally (no API needed!)
        const summary = createSmartSummary(article.description, article.title);

        summaryEl.innerHTML = `
            <span style="font-size: 1.1rem; line-height: 1.7;">${summary}</span>
        `;
        summaryBox.style.borderColor = 'rgba(99, 102, 241, 0.5)';

    } catch (error) {
        console.error('Summary generation failed:', error);
        summaryEl.innerHTML = article.description || 'Full article available at source.';
    }
}

// Smart local text summarization (no API required!)
function createSmartSummary(text, title) {
    if (!text || text.length < 50) {
        return text || 'Read the full article for more details.';
    }

    // Clean the text
    let cleanedText = text
        .replace(/\s+/g, ' ')
        .replace(/\[.*?\]/g, '')
        .trim();

    // Split into sentences
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];

    // Get first 2-3 most informative sentences
    let summaryParts = [];
    let totalLength = 0;
    const maxLength = 250;

    for (let sentence of sentences) {
        sentence = sentence.trim();

        // Skip very short sentences or ones that seem like metadata
        if (sentence.length < 20) continue;
        if (sentence.toLowerCase().includes('click here')) continue;
        if (sentence.toLowerCase().includes('read more')) continue;
        if (sentence.toLowerCase().includes('subscribe')) continue;

        // Don't repeat the title
        if (title && sentence.toLowerCase().includes(title.toLowerCase().substring(0, 30))) {
            continue;
        }

        if (totalLength + sentence.length <= maxLength) {
            summaryParts.push(sentence);
            totalLength += sentence.length;
        }

        if (summaryParts.length >= 2) break;
    }

    // If we have content, return it
    if (summaryParts.length > 0) {
        let summary = summaryParts.join(' ');

        // Add emphasis to key words
        const emphasisWords = ['breaking', 'exclusive', 'major', 'urgent', 'first', 'new', 'latest'];
        emphasisWords.forEach(word => {
            const regex = new RegExp(`\\b(${word})\\b`, 'gi');
            summary = summary.replace(regex, '<strong>$1</strong>');
        });

        return summary;
    }

    // Fallback: just truncate nicely
    if (cleanedText.length > maxLength) {
        return cleanedText.substring(0, maxLength).trim() + '...';
    }

    return cleanedText;
}

// Extract relevant tags from content
function extractTags(title, description, category) {
    const text = `${title} ${description}`.toLowerCase();
    const tags = [category];

    // Common news topics
    const topicPatterns = {
        'ai': /\b(ai|artificial intelligence|machine learning|chatgpt|openai)\b/i,
        'crypto': /\b(crypto|bitcoin|ethereum|blockchain|nft)\b/i,
        'tesla': /\btesla\b/i,
        'apple': /\bapple\b/i,
        'google': /\bgoogle\b/i,
        'microsoft': /\bmicrosoft\b/i,
        'amazon': /\bamazon\b/i,
        'climate': /\b(climate|environment|carbon|green)\b/i,
        'space': /\b(space|nasa|spacex|rocket|mars|moon)\b/i,
        'health': /\b(health|medicine|covid|vaccine|disease)\b/i,
        'politics': /\b(election|vote|president|government|congress)\b/i,
        'economy': /\b(economy|inflation|stock|market|gdp)\b/i,
        'china': /\bchina\b/i,
        'usa': /\b(usa|america|united states)\b/i,
        'europe': /\b(europe|eu|european)\b/i
    };

    for (const [tag, pattern] of Object.entries(topicPatterns)) {
        if (pattern.test(text) && !tags.includes(tag)) {
            tags.push(tag);
        }
        if (tags.length >= 4) break;
    }

    // Ensure at least 3 tags
    if (tags.length < 3) {
        const fallbackTags = ['breaking', 'news', 'trending', 'update', 'latest'];
        for (const tag of fallbackTags) {
            if (!tags.includes(tag)) {
                tags.push(tag);
                if (tags.length >= 3) break;
            }
        }
    }

    return tags.slice(0, 4);
}

// Download share card as image for social media
async function downloadShareCard(articleId) {
    const card = document.getElementById('shareCard');
    if (!card) {
        showToast('Unable to generate image', 'error');
        return;
    }

    const btn = document.querySelector('.download-card-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `
        <span class="loading-spinner"></span>
        Generating HD image...
    `;
    btn.disabled = true;

    try {
        // Wait for image to fully load
        const img = card.querySelector('img');
        if (img && !img.complete) {
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
                setTimeout(resolve, 2000); // Timeout fallback
            });
        }

        // Use html2canvas with maximum quality settings
        const canvas = await html2canvas(card, {
            scale: 3, // 3x resolution for crisp social media quality
            backgroundColor: '#1a1a2e',
            logging: false,
            useCORS: true,
            allowTaint: true,
            imageTimeout: 5000,
            removeContainer: true,
            // Improve rendering quality
            onclone: (clonedDoc) => {
                const clonedCard = clonedDoc.getElementById('shareCard');
                if (clonedCard) {
                    clonedCard.style.transform = 'none';
                    clonedCard.style.borderRadius = '24px';
                }
            }
        });

        // Create high quality PNG
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Convert to blob and download
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QNews-${articleId}-HD.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('📸 HD card downloaded! Perfect for Instagram, Twitter & LinkedIn.', 'success');
        }, 'image/png', 1.0);

    } catch (error) {
        console.error('Download failed:', error);
        showToast('Failed to generate image. Try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
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
// RSS Feed Fetching (Indian News Sources)
// ========================================

async function loadAllFeeds() {
    isLoading = true;
    showLoadingState();

    try {
        // Load feeds in parallel with timeout
        const feedPromises = Object.entries(CONFIG.feeds).map(([category, url]) =>
            Promise.race([
                fetchFeed(url, category),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 10000))
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

        // Sort by date (newest first)
        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // Store in map for quick lookup
        allArticles.forEach(article => {
            articlesMap.set(article.id, article);
        });

        if (elements.totalArticles) {
            animateNumber(elements.totalArticles, allArticles.length);
        }

        // FAILSAFE: If no articles loaded (e.g. proxy blocks), load demo data
        if (allArticles.length === 0) {
            console.warn('⚠️ Network failed. Loading Demo/Fallback Data.');
            loadDemoData();
        } else {
            console.log(`✅ Loaded ${allArticles.length} total articles`);
            renderTrendingCarousel();
            renderNewsGrid();
        }

    } catch (error) {
        console.error('Error loading feeds:', error);
        loadDemoData(); // Fallback on error
    }

    isLoading = false;
}

// Failsafe: Hardcoded demo data so app never looks empty
function loadDemoData() {
    const demoArticles = [
        {
            id: 'demo-1',
            title: 'ISRO to Launch New Satellite Mission Next Month',
            description: 'The Indian Space Research Organisation is gearing up for its next major launch vehicle mission, promising advanced communication capabilities.',
            image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
            category: 'technology',
            source: 'ISRO News',
            pubDate: new Date().toISOString(),
            bulletPoints: ['Mission scheduled for next month', 'Advanced communication tech', 'Indigenous launch vehicle']
        },
        {
            id: 'demo-2',
            title: 'Sensex Hits All-Time High Amid Global Rally',
            description: 'Indian stock markets reached new heights today as global investor sentiment improved and domestic earnings defied expectations.',
            image: 'https://images.unsplash.com/photo-1611974765270-ca12586343bb?w=800',
            category: 'business',
            source: 'Market Watch',
            pubDate: new Date().toISOString(),
            bulletPoints: ['Sensex crosses 75,000 mark', 'Banking sector leads rally', 'Foreign investment increases']
        },
        {
            id: 'demo-3',
            title: 'India Wins Thrilling Cricket Match Against Australia',
            description: 'In a nail-biting finish, the Indian cricket team secured a victory in the final over, chasing down a massive target.',
            image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
            category: 'sports',
            source: 'Sports Daily',
            pubDate: new Date().toISOString(),
            bulletPoints: ['Last over thriller', 'Kohli centuries', 'Series leveled 1-1']
        },
        {
            id: 'demo-4',
            title: 'New AI Tools Revolutionize Filmmaking in Bollywood',
            description: 'Directors are using generative AI to create stunning visual effects and script enhancements, changing the landscape of Indian cinema.',
            image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
            category: 'entertainment',
            source: 'Cinema Today',
            pubDate: new Date().toISOString(),
            bulletPoints: ['VFX costs reduced by 40%', 'AI script assistance', 'Virtual production studios']
        }
    ];

    // Generate more based on categories to fill grid
    CONFIG.categories.forEach((cat, i) => {
        for (let j = 0; j < 3; j++) {
            demoArticles.push({
                id: `demo-gen-${cat}-${j}`,
                title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Update: Major Developments Reported Today`,
                description: `Latest breaking news from the world of ${cat}. Experts discuss the implications of recent events and what this means for the future.`,
                image: getRandomImage(cat),
                category: cat,
                source: 'Q News Network',
                pubDate: new Date().toISOString(),
                bulletPoints: ['Key development reported', 'Expert analysis pending', 'Global impact expected']
            });
        }
    });

    allArticles.push(...demoArticles);
    articlesMap.clear();
    allArticles.forEach(a => articlesMap.set(a.id, a));

    renderTrendingCarousel();
    renderNewsGrid();
    showToast('Network unstable. Showing cached/demo news.', 'info');
}

async function fetchFeed(feedUrl, category) {
    // Try each proxy until one works
    for (let i = 0; i < CONFIG.corsProxies.length; i++) {
        try {
            const proxy = CONFIG.corsProxies[i];
            const proxyUrl = proxy + encodeURIComponent(feedUrl);

            const response = await fetch(proxyUrl);
            if (!response.ok) continue;

            const text = await response.text();
            if (!text || text.length < 100) continue;

            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');

            const items = xml.querySelectorAll('item');
            if (items.length === 0) continue;

            const articles = [];

            items.forEach((item, index) => {
                if (index >= 20) return;

                const title = item.querySelector('title')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();

                let image = extractImage(item, text);
                if (!image) {
                    image = getRandomImage(category);
                }

                const content = cleanText(description);
                const bulletPoints = extractBulletPoints(content, title);

                const articleId = `${category}-${index}`;

                articles.push({
                    id: articleId,
                    title: cleanText(title),
                    description: content,
                    content: content,
                    bulletPoints: bulletPoints,
                    link,
                    pubDate,
                    image,
                    category,
                    source: getSourceName(feedUrl)
                });
            });

            console.log(`✅ Loaded ${articles.length} articles for ${category} via proxy ${i + 1}`);
            return articles;

        } catch (error) {
            console.warn(`Proxy ${i + 1} failed for ${category}:`, error.message);
            continue;
        }
    }

    console.error(`❌ All proxies failed for ${category}`);
    return [];
}

// Extract bullet points from content
function extractBulletPoints(content, title) {
    if (!content || content.length < 50) {
        return [];
    }

    // Clean content
    let cleanContent = content
        .replace(/\[\+\d+ chars\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Split into sentences
    const sentences = cleanContent.match(/[^.!?]+[.!?]+/g) || [];

    const points = [];
    const titleLower = title.toLowerCase();

    for (const sentence of sentences) {
        const trimmed = sentence.trim();

        // Skip short sentences, title repetitions, and filler
        if (trimmed.length < 30) continue;
        if (titleLower.includes(trimmed.toLowerCase().substring(0, 40))) continue;
        if (trimmed.toLowerCase().includes('click here')) continue;
        if (trimmed.toLowerCase().includes('read more')) continue;

        points.push(trimmed);

        if (points.length >= 3) break;
    }

    return points;
}

function extractImage(item, rawText) {
    // 1. Try media:content (standard for high res)
    const mediaContent = item.querySelector('content');
    if (mediaContent?.getAttribute('url')) {
        let url = mediaContent.getAttribute('url');
        // Times of India specific: try to get high res
        if (url.includes('photo.cms')) {
            return url.replace('photo.cms', 'photohd.cms'); // Fake upgrade attempt
        }
        return url;
    }

    // 2. Try media:thumbnail (often smaller but reliable)
    const thumbnail = item.querySelector('thumbnail');
    if (thumbnail?.getAttribute('url')) {
        return thumbnail.getAttribute('url').replace('width=400', 'width=800').replace('size=400', 'size=800');
    }

    // 3. Try enclosure (podcast/RSS standard)
    const enclosure = item.querySelector('enclosure');
    if (enclosure?.getAttribute('url') && enclosure.getAttribute('type')?.includes('image')) {
        return enclosure.getAttribute('url');
    }

    // 4. Try parsing description HTML for the first image
    const description = item.querySelector('description')?.textContent || '';
    const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) {
        // TOI/others sometimes put small thumbnails in description. 
        // Try to heuristic upgrade:
        let src = imgMatch[1];
        if (src.includes('width=')) src = src.replace(/width=\d+/, 'width=800');
        if (src.includes('size=')) src = src.replace(/size=\d+/, 'size=800');
        return src;
    }

    // 5. Try encoded content (full article HTML)
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
window.downloadShareCard = downloadShareCard;
