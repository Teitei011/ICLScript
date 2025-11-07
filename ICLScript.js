// Instituto Conhecimento Liberta (ICL) Plugin for Grayjay
// Provides access to series, documentaries, and courses from membro.icl.com.br

const BASE_URL = "https://membro.icl.com.br";
const PLATFORM = "ICL";

// Plugin configuration
var config = {};

// Source definition - Define properties individually to avoid constant assignment
// Plugin initialization
source.enable = function(conf, settings, savedState) {
    try {
        config = conf ?? {};
        log("ICL Plugin enabled");
        log("Authentication status: " + (bridge.isLoggedIn() ? "Logged in" : "Not logged in"));
    } catch (e) {
        log("Error during enable: " + e.message);
        config = {};
    }
};

// Plugin cleanup
source.disable = function() {
    log("ICL Plugin disabled");
};

// Save plugin state
source.saveState = function() {
    return {};
};

// Helper to check authentication
source.ensureAuthenticated = function() {
    if (!bridge.isLoggedIn()) {
        throw new ScriptException("Please log in to ICL to access content. Tap 'Login' in the plugin settings.");
    }
};

// Helper to make authenticated requests
source.makeAuthenticatedRequest = function(url, method = "GET", body = null) {
        this.ensureAuthenticated();

        const userAgent = (config.authentication && config.authentication.userAgent)
            ? config.authentication.userAgent
            : "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36";

        const headers = {
            "User-Agent": userAgent
        };

    if (method === "GET") {
        return http.GET(url, headers, false);
    } else if (method === "POST") {
        headers["Content-Type"] = "application/json";
        return http.POST(url, body, headers, false);
    }
};

// Get home feed
source.getHome = function() {
        log("Getting home feed from ICL");

        try {
            // Get the main members page
            const response = this.makeAuthenticatedRequest(BASE_URL + "/entretenimento/");
            const html = response.body;

            // Parse the HTML to extract content
            const dom = domParser.parseFromString(html, "text/html");
            const videos = this.parseContentFromPage(dom);

            return new ContentPager(videos, false);
    } catch (e) {
        log("Error getting home feed: " + e.message);
        // Return empty pager if there's an error
        return new ContentPager([], false);
    }
};

// Parse content items from HTML page
source.parseContentFromPage = function(dom) {
        const videos = [];

        try {
            // Look for video/course containers
            // This will need to be adjusted based on actual HTML structure
            const contentElements = dom.querySelectorAll('.course-item, .video-item, .content-item, article');

            for (let i = 0; i < contentElements.length; i++) {
                const element = contentElements[i];

                try {
                    // Extract video information
                    const titleElement = element.querySelector('h2, h3, .title, .course-title, .video-title');
                    const linkElement = element.querySelector('a');
                    const thumbnailElement = element.querySelector('img');
                    const descriptionElement = element.querySelector('.description, .excerpt, p');

                    if (!titleElement || !linkElement) {
                        continue;
                    }

                    const title = titleElement.textContent.trim();
                    const url = linkElement.getAttribute('href');
                    const thumbnailUrl = thumbnailElement ? thumbnailElement.getAttribute('src') : null;
                    const description = descriptionElement ? descriptionElement.textContent.trim() : "";

                    // Create absolute URL if relative
                    const fullUrl = url.startsWith('http') ? url : BASE_URL + url;

                    // Create PlatformVideo object
                    const video = new PlatformVideo({
                        id: new PlatformID(PLATFORM, fullUrl, config.id),
                        name: title,
                        thumbnails: thumbnailUrl ? new Thumbnails([new Thumbnail(thumbnailUrl, 0)]) : new Thumbnails([]),
                        author: new PlatformAuthorLink(new PlatformID(PLATFORM, BASE_URL, config.id), "Instituto Conhecimento Liberta", BASE_URL, null),
                        uploadDate: Math.floor(Date.now() / 1000),
                        duration: 0,
                        viewCount: 0,
                        url: fullUrl,
                        isLive: false
                    });

                    videos.push(video);
                } catch (e) {
                    log("Error parsing content element: " + e.message);
                }
            }
    } catch (e) {
        log("Error parsing content from page: " + e.message);
    }

    return videos;
};

// Search capabilities
source.getSearchCapabilities = function() {
    return {
        types: [Type.Feed.Mixed],
        sorts: [Type.Order.Chronological],
        filters: []
    };
};

// Search for content
source.search = function(query, type, order, filters) {
        log("Searching ICL for: " + query);

        try {
            // Use WordPress search
            const searchUrl = BASE_URL + "/?s=" + encodeURIComponent(query);
            const response = this.makeAuthenticatedRequest(searchUrl);
            const html = response.body;

            const dom = domParser.parseFromString(html, "text/html");
            const videos = this.parseContentFromPage(dom);

            return new ContentPager(videos, false);
    } catch (e) {
        log("Error searching: " + e.message);
        return new ContentPager([], false);
    }
};

// Search suggestions
source.searchSuggestions = function(query) {
    return [];
};

// Check if URL is a content details URL
source.isContentDetailsUrl = function(url) {
    return url.includes("membro.icl.com.br") &&
           (url.includes("/curso/") || url.includes("/video/") || url.includes("/aula/") ||
            url.includes("/serie/") || url.includes("/documentario/"));
};

// Get content details
source.getContentDetails = function(url) {
        log("Getting content details for: " + url);

        try {
            const response = this.makeAuthenticatedRequest(url);
            const html = response.body;
            const dom = domParser.parseFromString(html, "text/html");

            // Extract video information
            const titleElement = dom.querySelector('h1, .entry-title, .course-title, .video-title');
            const title = titleElement ? titleElement.textContent.trim() : "Unknown Title";

            const descriptionElement = dom.querySelector('.description, .entry-content, .course-description');
            const description = descriptionElement ? descriptionElement.textContent.trim() : "";

            const thumbnailElement = dom.querySelector('meta[property="og:image"]') || dom.querySelector('.video-thumbnail img, img');
            const thumbnailUrl = thumbnailElement ? (thumbnailElement.getAttribute('content') || thumbnailElement.getAttribute('src')) : null;

            // Find video source
            // Look for video tags, iframe embeds, or custom video players
            const videoElement = dom.querySelector('video source, video');
            const iframeElement = dom.querySelector('iframe[src*="player"], iframe[src*="video"]');

            let videoUrl = null;
            let videoSources = [];

            if (videoElement) {
                // Direct video element
                videoUrl = videoElement.getAttribute('src');
                if (videoUrl) {
                    videoSources.push(new VideoUrlSource({
                        url: videoUrl.startsWith('http') ? videoUrl : BASE_URL + videoUrl,
                        width: 1920,
                        height: 1080,
                        container: "video/mp4",
                        codec: "h264",
                        name: "Direct",
                        bitrate: 0,
                        duration: 0
                    }));
                }
            } else if (iframeElement) {
                // Embedded video
                const embedUrl = iframeElement.getAttribute('src');
                if (embedUrl) {
                    // Try to extract the actual video URL from the embed
                    videoSources.push(new VideoUrlSource({
                        url: embedUrl.startsWith('http') ? embedUrl : BASE_URL + embedUrl,
                        width: 1920,
                        height: 1080,
                        container: "video/mp4",
                        codec: "h264",
                        name: "Embed",
                        bitrate: 0,
                        duration: 0
                    }));
                }
            }

            // Look for HLS or DASH sources
            const scripts = dom.querySelectorAll('script');
            for (let i = 0; i < scripts.length; i++) {
                const scriptContent = scripts[i].textContent;

                // Look for .m3u8 URLs (HLS)
                const hlsMatch = scriptContent.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
                if (hlsMatch) {
                    videoSources.push(new HLSSource({
                        name: "HLS",
                        duration: 0,
                        url: hlsMatch[1]
                    }));
                }

                // Look for .mpd URLs (DASH)
                const dashMatch = scriptContent.match(/(https?:\/\/[^\s"']+\.mpd[^\s"']*)/);
                if (dashMatch) {
                    videoSources.push(new DashSource({
                        name: "DASH",
                        duration: 0,
                        url: dashMatch[1]
                    }));
                }

                // Look for direct video URLs
                const mp4Match = scriptContent.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/);
                if (mp4Match && videoSources.length === 0) {
                    videoSources.push(new VideoUrlSource({
                        url: mp4Match[1],
                        width: 1920,
                        height: 1080,
                        container: "video/mp4",
                        codec: "h264",
                        name: "Direct",
                        bitrate: 0,
                        duration: 0
                    }));
                }
            }

            if (videoSources.length === 0) {
                throw new ScriptException("Could not find video source on page");
            }

            // Create PlatformVideoDetails object
            return new PlatformVideoDetails({
                id: new PlatformID(PLATFORM, url, config.id),
                name: title,
                thumbnails: thumbnailUrl ? new Thumbnails([new Thumbnail(thumbnailUrl, 0)]) : new Thumbnails([]),
                author: new PlatformAuthorLink(new PlatformID(PLATFORM, BASE_URL, config.id), "Instituto Conhecimento Liberta", BASE_URL, null),
                uploadDate: Math.floor(Date.now() / 1000),
                duration: 0,
                viewCount: 0,
                url: url,
                isLive: false,
                description: description,
                video: new VideoSourceDescriptor(videoSources),
                rating: new RatingLikes(0),
                subtitles: []
            });

    } catch (e) {
        log("Error getting content details: " + e.message);
        throw new ScriptException("Failed to get content details: " + e.message);
    }
};

// Channel URL check
source.isChannelUrl = function(url) {
    return false; // ICL doesn't have traditional channels
};

// Get channel (not implemented for ICL)
source.getChannel = function(url) {
    throw new ScriptException("Channels are not supported for ICL");
};

// Get channel contents (not implemented for ICL)
source.getChannelContents = function(url) {
    throw new ScriptException("Channels are not supported for ICL");
};

// Search channel contents capabilities
source.getSearchChannelContentsCapabilities = function() {
    return {
        types: [Type.Feed.Mixed],
        sorts: [Type.Order.Chronological],
        filters: []
    };
};

// Search channel contents (not implemented for ICL)
source.searchChannelContents = function(channelUrl, query, type, order, filters) {
    throw new ScriptException("Channel search is not supported for ICL");
};

// Get comments (not implemented)
source.getComments = function(url) {
    return new CommentPager([], false, {});
};

// Get sub-comments (not implemented)
source.getSubComments = function(comment) {
    return new CommentPager([], false, {});
};

// Logging helper
function log(message) {
    console.log("[ICL Plugin] " + message);
}
