// Vercel Serverless Function to fetch og:image from article URL
// Handles Google News redirects to get real article content
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    let { url } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL required' });
    }

    try {
        // Google News URLs need special handling - follow redirect to real article
        if (url.includes('news.google.com') || url.includes('google.com/rss')) {
            const redirectResponse = await fetch(url, {
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            // Get the final URL after redirects
            url = redirectResponse.url;
            console.log('Followed redirect to:', url);
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
        }

        const html = await response.text();

        // Extract og:image (multiple patterns for different sites)
        let image = null;
        const ogPatterns = [
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
            /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
        ];

        for (const pattern of ogPatterns) {
            const match = html.match(pattern);
            if (match?.[1] && !match[1].includes('google.com')) {
                image = match[1];
                if (image.startsWith('//')) image = 'https:' + image;
                break;
            }
        }

        // Extract og:description
        let description = null;
        const descPatterns = [
            /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
        ];

        for (const pattern of descPatterns) {
            const match = html.match(pattern);
            if (match?.[1] && !match[1].includes('Google News')) {
                description = match[1];
                break;
            }
        }

        console.log('Extracted:', { image: !!image, description: !!description });

        res.status(200).json({
            success: true,
            image,
            description,
            finalUrl: url
        });

    } catch (error) {
        console.error('OG fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
