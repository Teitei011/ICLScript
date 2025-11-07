<<<<<<< HEAD
const PLATFORM = "ICL";
const PLATFORM_CLAIMTYPE = 9999;

const config = {
    id: "ICL",
    name: "Instituto Conhecimento Liberta",
    description: "Plugin para acessar conteúdos educacionais do Instituto Conhecimento Liberta",
    author: "ICL Community",
    authorUrl: "https://icl.com.br",
    sourceUrl: "https://membro.icl.com.br",
    scriptUrl: "./ICLScript.js",
    version: 3,
    iconUrl: "https://membro.icl.com.br/app/uploads/2024/03/cropped-favicon-192x192.png",
    
    authentication: {
        userLoginUrl: "https://membro.icl.com.br/wp-login.php",
        completionUrl: "https://membro.icl.com.br/",
        cookiesToFind: ["wordpress_logged_in"]
    },
    
    capabilities: {
        types: ["MEDIA_VIDEO_TYPE"],
        sorts: ["SORT_CHRONOLOGICAL"],
        filters: []
    },
    
    settings: [
        {
            variable: "preferredDownloadQuality",
            name: "Qualidade de Download Preferida",
            description: "Escolha a qualidade para downloads",
            type: "dropdown",
            default: "1080p",
            options: ["2160p", "1080p", "720p", "480p", "360p"]
        }
    ]
};



var source = {
    enable: function(conf, settings, savedState) {
        this.baseUrl = "https://membro.icl.com.br";
        this.preferredQuality = settings.preferredDownloadQuality || "1080p";
        log("ICL Plugin v3 enabled with download support");
    },
    
    getHome: function() {
        log("Getting ICL home");
        const html = http.GET(this.baseUrl, {}, false).body;
        const results = [];
        
        // Parse main sections
        ["entretenimento", "favoritos", "emprogresso", "novos"].forEach(sectionId => {
            const section = this.extractSection(html, 'id="' + sectionId + '"');
            if (section) {
                results.push(...this.parseVideoList(section));
            }
        });
        
        return new VideoPager(results, false);
    },
    
    searchSuggestions: function(query) {
        return [];
    },
    
    getSearchCapabilities: function() {
        return {
            types: ["MEDIA_VIDEO_TYPE"],
            sorts: ["SORT_CHRONOLOGICAL"],
            filters: []
        };
    },
    
    search: function(query, type, order, filters) {
        log("Searching: " + query);
        const searchUrl = this.baseUrl + "/?s=" + encodeURIComponent(query);
        const html = http.GET(searchUrl, {}, false).body;
        const results = this.parseVideoList(html);
        return new VideoPager(results, false);
    },
    
    getSearchChannelContents: function(channelUrl, query, type, order, filters) {
        return this.search(query, type, order, filters);
    },
    
    isChannelUrl: function(url) {
        return false;
    },
    
    getChannel: function(url) {
        throw new ScriptException("Channels not supported");
    },
    
    getChannelContents: function(url) {
        throw new ScriptException("Channels not supported");
    },
    
    isContentDetailsUrl: function(url) {
        return url.includes("/curso/") || 
               url.includes("/watch/") ||
               url.includes("/aula/") ||
               url.includes("/episodio/");
    },
    
    getContentDetails: function(url) {
        log("Getting details: " + url);
        
        // If it's a direct video URL (episodio/aula), extract video directly
        if (url.includes("/episodio/") || url.includes("/aula/")) {
            return this.getVideoDetails(url);
        }
        
        // If it's a course or watch page, get overview
        const html = http.GET(url, {}, false).body;
        
        // Extract title
        const titleMatch = html.match(/<h1[^>]*class="entry-title"[^>]*>(.*?)<\/h1>/s) ||
                          html.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? this.cleanHtml(titleMatch[1].split('–')[0]) : "Untitled";
        
        // Extract description
        const descMatch = html.match(/<div[^>]*class="description"[^>]*>(.*?)<\/div>/s) ||
                         html.match(/<div[^>]*class="episode_content_wrap"[^>]*>(.*?)<\/div>/s);
        const description = descMatch ? this.cleanHtml(descMatch[1]) : "";
        
        // Extract thumbnail
        const thumbMatch = html.match(/src=['"]([^'"]*uploads[^'"]*\.(?:jpg|jpeg|png|webp)[^'"]*)['"]/i);
        const thumbnail = thumbMatch ? thumbMatch[1] : "";
        
        // For courses, get lessons
        let videoSources = [];
        if (url.includes("/curso/")) {
            const lessons = this.extractLessons(html, url);
            // Return series with episodes
            return this.createSeriesDetails(title, description, thumbnail, url, lessons);
        }
        
        // For watch pages, get episode link
        if (url.includes("/watch/")) {
            const episodeLink = html.match(/href=['"]([^'"]*\/episodio\/[^'"]*)['"]/);
            if (episodeLink) {
                return this.getVideoDetails(episodeLink[1]);
            }
        }
        
        // Fallback to basic video details
        return this.createBasicVideoDetails(title, description, thumbnail, url);
    },
    
    getVideoDetails: function(url) {
        log("Getting video from: " + url);
        const html = http.GET(url, {}, false).body;
        
        // Extract title
        const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
        const title = titleMatch ? this.cleanHtml(titleMatch[1]) : "Video";
        
        // Extract description
        const descMatch = html.match(/<div[^>]*class="episode_content_wrap"[^>]*>(.*?)<\/div>/s);
        const description = descMatch ? this.cleanHtml(descMatch[1]) : "";
        
        // Extract thumbnail/poster
        const posterMatch = html.match(/data-poster=['"]([^'"]*)['"]/);
        const thumbnail = posterMatch ? posterMatch[1] : "";
        
        // Extract HLS source
        const hlsMatch = html.match(/const source = ['"]([^'"]*\.m3u8[^'"]*)['"]/);
        
        // Extract MP4 fallback
        const mp4Match = html.match(/video\.src = ['"]([^'"]*\.mp4[^'"]*)['"]/);
        
        const videoSources = [];
        
        if (hlsMatch) {
            videoSources.push(new HLSSource({
                name: "HLS",
                duration: 0,
                url: hlsMatch[1]
            }));
        }
        
        if (mp4Match) {
            videoSources.push(new VideoUrlSource({
                url: mp4Match[1],
                name: "MP4 720p",
                width: 1280,
                height: 720,
                container: "video/mp4",
                codec: "h264",
                bitrate: 2500000
            }));
        }
        
        return new PlatformVideoDetails({
            id: new PlatformID(PLATFORM, url, config.id, PLATFORM_CLAIMTYPE),
            name: title,
            thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, this.baseUrl, config.id, PLATFORM_CLAIMTYPE),
                "Instituto Conhecimento Liberta",
                this.baseUrl,
                ""
            ),
            uploadDate: Math.floor(Date.now() / 1000),
            duration: 0,
            viewCount: 0,
            url: url,
            isLive: false,
            description: description,
            video: new VideoSourceDescriptor(videoSources),
            rating: new RatingLikes(0)
        });
    },
    
    // NEW: Download support
    getVideoDownload: function(url) {
        log("Getting download sources for: " + url);
        
        // Redirect to actual video page if needed
        let videoUrl = url;
        if (url.includes("/watch/")) {
            const html = http.GET(url, {}, false).body;
            const episodeLink = html.match(/href=['"]([^'"]*\/episodio\/[^'"]*)['"]/);
            if (episodeLink) {
                videoUrl = episodeLink[1];
            }
        }
        
        const html = http.GET(videoUrl, {}, false).body;
        
        // Extract video ID from HLS URL
        const hlsMatch = html.match(/const source = ['"]([^'"]*\.m3u8[^'"]*)['"]/);
        
        if (hlsMatch) {
            const hlsUrl = hlsMatch[1];
            // Extract base URL and video ID from HLS URL
            // Format: https://vz-2ba1f432-e78.b-cdn.net/VIDEO_ID/playlist.m3u8
            const videoIdMatch = hlsUrl.match(/\/([^\/]+)\/playlist\.m3u8/);
            
            if (videoIdMatch) {
                const videoId = videoIdMatch[1];
                const baseUrl = hlsUrl.replace(/\/[^\/]+\/playlist\.m3u8/, '');
                
                // BunnyCDN typically provides these MP4 variants
                const downloadSources = [];
                
                // Try to get available qualities
                const qualities = [
                    { name: "2160p", height: 2160, width: 3840, filename: "play_2160p.mp4", bitrate: 15000000 },
                    { name: "1440p", height: 1440, width: 2560, filename: "play_1440p.mp4", bitrate: 10000000 },
                    { name: "1080p", height: 1080, width: 1920, filename: "play_1080p.mp4", bitrate: 5000000 },
                    { name: "720p", height: 720, width: 1280, filename: "play_720p.mp4", bitrate: 2500000 },
                    { name: "480p", height: 480, width: 854, filename: "play_480p.mp4", bitrate: 1000000 },
                    { name: "360p", height: 360, width: 640, filename: "play_360p.mp4", bitrate: 600000 }
                ];
                
                qualities.forEach(quality => {
                    const downloadUrl = baseUrl + "/" + videoId + "/" + quality.filename;
                    
                    // Check if this quality exists (head request or just add all)
                    downloadSources.push(new VideoUrlSource({
                        url: downloadUrl,
                        name: "MP4 " + quality.name,
                        width: quality.width,
                        height: quality.height,
                        container: "video/mp4",
                        codec: "h264",
                        bitrate: quality.bitrate
                    }));
                });
                
                if (downloadSources.length > 0) {
                    return new VideoSourceDescriptor(downloadSources);
                }
            }
        }
        
        // Fallback to MP4 if found in page
        const mp4Match = html.match(/video\.src = ['"]([^'"]*\.mp4[^'"]*)['"]/);
        if (mp4Match) {
            return new VideoSourceDescriptor([
                new VideoUrlSource({
                    url: mp4Match[1],
                    name: "MP4 720p",
                    width: 1280,
                    height: 720,
                    container: "video/mp4",
                    codec: "h264",
                    bitrate: 2500000
                })
            ]);
        }
        
        throw new ScriptException("No download sources found");
    },
    
    createSeriesDetails: function(title, description, thumbnail, url, lessons) {
        const contents = lessons.map((lesson, index) => {
            return new PlatformVideo({
                id: new PlatformID(PLATFORM, lesson.url, config.id, PLATFORM_CLAIMTYPE),
                name: lesson.title,
                thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
                author: new PlatformAuthorLink(
                    new PlatformID(PLATFORM, this.baseUrl, config.id, PLATFORM_CLAIMTYPE),
                    "Instituto Conhecimento Liberta",
                    this.baseUrl,
                    ""
                ),
                uploadDate: Math.floor(Date.now() / 1000),
                duration: 0,
                viewCount: 0,
                url: lesson.url,
                isLive: false
            });
        });
        
        return new PlatformVideoDetails({
            id: new PlatformID(PLATFORM, url, config.id, PLATFORM_CLAIMTYPE),
            name: title,
            thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, this.baseUrl, config.id, PLATFORM_CLAIMTYPE),
                "Instituto Conhecimento Liberta",
                this.baseUrl,
                ""
            ),
            uploadDate: Math.floor(Date.now() / 1000),
            duration: 0,
            viewCount: 0,
            url: url,
            isLive: false,
            description: description,
            video: new VideoSourceDescriptor([]),
            rating: new RatingLikes(0),
            content: new NestedPlatformContent(contents)
        });
    },
    
    createBasicVideoDetails: function(title, description, thumbnail, url) {
        return new PlatformVideoDetails({
            id: new PlatformID(PLATFORM, url, config.id, PLATFORM_CLAIMTYPE),
            name: title,
            thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, this.baseUrl, config.id, PLATFORM_CLAIMTYPE),
                "Instituto Conhecimento Liberta",
                this.baseUrl,
                ""
            ),
            uploadDate: Math.floor(Date.now() / 1000),
            duration: 0,
            viewCount: 0,
            url: url,
            isLive: false,
            description: description,
            video: new VideoSourceDescriptor([]),
            rating: new RatingLikes(0)
        });
    },
    
    extractLessons: function(html, courseUrl) {
        const lessons = [];
        const lessonRegex = /<div class="ld-item-list-item[^>]*>[\s\S]*?href=['"]([^'"]*\/aula\/[^'"]*)['"]/g;
        let match;
        
        while ((match = lessonRegex.exec(html)) !== null) {
            const lessonUrl = match[1];
            const titleMatch = match[0].match(/<div class="ld-item-title">(.*?)<\/div>/s);
            const title = titleMatch ? this.cleanHtml(titleMatch[1]) : "Lesson";
            
            lessons.push({
                url: lessonUrl,
                title: title
            });
        }
        
        // Handle pagination if needed
        const hasMorePages = html.includes('class="next ld-primary-color-hover"');
        if (hasMorePages && lessons.length > 0) {
            // Get next page lessons
            const nextPageMatch = html.match(/href=['"]([^'"]*\?ld-lesson-page=2[^'"]*)['"]/);
            if (nextPageMatch) {
                try {
                    const nextHtml = http.GET(nextPageMatch[1], {}, false).body;
                    lessons.push(...this.extractLessons(nextHtml, courseUrl));
                } catch (e) {
                    log("Error fetching next page: " + e);
                }
            }
        }
        
        return lessons;
    },
    
    extractSection: function(html, sectionId) {
        const regex = new RegExp('<section[^>]*' + sectionId + '[^>]*>([\\s\\S]*?)<\\/section>', 'i');
        const match = html.match(regex);
        return match ? match[1] : null;
    },
    
    parseVideoList: function(html) {
        const results = [];
        const itemRegex = /<li[^>]*class="[^"]*(?:slide__item|bb-course-item-wrap)[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
        let match;
        
        while ((match = itemRegex.exec(html)) !== null) {
            const item = match[1];
            
            // Extract URL
            const urlMatch = item.match(/href=['"]([^'"]*(?:curso|watch|aula|episodio)[^'"]*)['"]/);
            if (!urlMatch) continue;
            const url = urlMatch[1];
            
            // Extract title
            const titleMatch = item.match(/title=['"]([^'"]*)['"]/i) ||
                              item.match(/<h[23][^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h[23]>/i);
            const title = titleMatch ? this.cleanHtml(titleMatch[1]) : "Untitled";
            
            // Extract thumbnail
            const thumbMatch = item.match(/src=['"]([^'"]*\.(?:jpg|jpeg|png|webp)[^'"]*)['"]/i);
            const thumbnail = thumbMatch ? thumbMatch[1] : "";
            
            results.push(new PlatformVideo({
                id: new PlatformID(PLATFORM, url, config.id, PLATFORM_CLAIMTYPE),
                name: title,
                thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
                author: new PlatformAuthorLink(
                    new PlatformID(PLATFORM, this.baseUrl, config.id, PLATFORM_CLAIMTYPE),
                    "Instituto Conhecimento Liberta",
                    this.baseUrl,
                    ""
                ),
=======
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
>>>>>>> master
                uploadDate: Math.floor(Date.now() / 1000),
                duration: 0,
                viewCount: 0,
                url: url,
<<<<<<< HEAD
                isLive: false
            }));
        }
        
        return results;
    },
    
    cleanHtml: function(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#8211;/g, '-')
            .replace(/&#8217;/g, "'")
            .trim();
    }
};

log("ICL Plugin v3 loaded with download support");


=======
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
>>>>>>> master
