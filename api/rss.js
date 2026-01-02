// Vercel Serverless Function to fetch RSS feeds (bypasses CORS)
export default async function handler(req, res) {
    // Enable CORS for our frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { category } = req.query;

    // Define RSS feeds for each category
    const feeds = {
        anime: 'https://news.google.com/rss/search?q=anime&hl=en-US&gl=US&ceid=US:en',
        manga: 'https://news.google.com/rss/search?q=manga+news&hl=en-US&gl=US&ceid=US:en',
        crunchyroll: 'https://news.google.com/rss/search?q=crunchyroll+anime&hl=en-US&gl=US&ceid=US:en',
        japan: 'https://news.google.com/rss/search?q=japan+anime+industry&hl=en-US&gl=US&ceid=US:en'
    };

    const feedUrl = feeds[category] || feeds.anime;

    try {
        const response = await fetch(feedUrl);

        if (!response.ok) {
            throw new Error(`RSS fetch failed: ${response.status}`);
        }

        const xml = await response.text();

        res.status(200).json({
            success: true,
            category: category || 'anime',
            data: xml
        });

    } catch (error) {
        console.error('RSS fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
