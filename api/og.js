// Vercel Serverless Function to fetch og:image from article URL
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL required' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; QNewsBot/1.0)'
            }
        });

        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
        }

        const html = await response.text();

        // Extract og:image
        let image = null;
        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

        if (ogMatch?.[1]) {
            image = ogMatch[1];
            if (image.startsWith('//')) image = 'https:' + image;
        }

        // Extract og:description for better summary
        let description = null;
        const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

        if (descMatch?.[1]) {
            description = descMatch[1];
        }

        res.status(200).json({
            success: true,
            image,
            description
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
