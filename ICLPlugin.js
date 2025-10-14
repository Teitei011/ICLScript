// ---------- CONFIG ----------
var PLATFORM = "ICL";
var PLATFORM_CLAIMTYPE = 9999;

var config = {
    name: "Instituto Conhecimento Liberta",
    description: "Plugin para acessar conteúdos educacionais do ICL",
    author: "ICL Community",
    authorUrl: "https://icl.com.br",
    
    // Public URL where this config will be hosted
    sourceUrl: "https://membro.icl.com.br/ICLPlugin.json",
    repositoryUrl: "https://github.com/yourrepo/icl-plugin",
    
    // Script file reference
    scriptUrl: "./ICLPlugin.js",
    
    // Version number
    version: 1,
    
    // Icon URL
    iconUrl: "https://membro.icl.com.br/app/uploads/2024/03/cropped-favicon-192x192.png",
    
    // Unique UUID (generate new one from https://www.uuidgenerator.net/)
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    
    // Required packages
    packages: ["Http", "DOMParser"],
    
    // Security settings
    allowEval: false,
    
    // Allowed domains (without https://)
    allowUrls: [
        "membro.icl.com.br"
    ],
    
    // Authentication configuration
    authentication: {
        loginUrl: "https://membro.icl.com.br/wp-login.php",
        completionUrl: "https://membro.icl.com.br/",
        cookiesToFind: ["wordpress_logged_in"]
    }
};

// ---------- SOURCE ----------
var source = {
    enable: function(conf, settings, savedState) {
        this.baseUrl = "https://membro.icl.com.br";
        log("ICL Plugin enabled");
    },
    
    getHome: function() {
        log("Getting home page");
        
        try {
            var html = http.GET(this.baseUrl, {}, false).body;
            var results = [];
            
            // Parse sections
            var sectionIds = ["entretenimento", "favoritos", "emprogresso", "novos"];
            
            for (var i = 0; i < sectionIds.length; i++) {
                var sectionId = sectionIds[i];
                var sectionHtml = this.extractSection(html, sectionId);
                
                if (sectionHtml) {
                    var videos = this.parseVideoList(sectionHtml);
                    for (var j = 0; j < videos.length; j++) {
                        results.push(videos[j]);
                    }
                }
            }
            
            return new VideoPager(results, false);
            
        } catch (e) {
            log("Error in getHome: " + e);
            return new VideoPager([], false);
        }
    },
    
    searchSuggestions: function(query) {
        return [];
    },
    
    getSearchCapabilities: function() {
        return {
            types: [Type.Feed.Mixed],
            sorts: [Type.Order.Chronological],
            filters: []
        };
    },
    
    search: function(query, type, order, filters) {
        log("Searching for: " + query);
        
        try {
            var searchUrl = this.baseUrl + "/?s=" + encodeURIComponent(query);
            var html = http.GET(searchUrl, {}, false).body;
            var results = this.parseVideoList(html);
            
            return new VideoPager(results, false);
            
        } catch (e) {
            log("Error in search: " + e);
            return new VideoPager([], false);
        }
    },
    
    getSearchChannelContents: function(channelUrl, query, type, order, filters) {
        return this.search(query, type, order, filters);
    },
    
    // ========================================
    // CHANNELS (NOT SUPPORTED)
    // ========================================
    isChannelUrl: function(url) {
        return false;
    },
    
    getChannel: function(url) {
        throw new ScriptException("Channels not supported");
    },
    
    getChannelContents: function(url, type, order, filters) {
        throw new ScriptException("Channels not supported");
    },
    
    // ========================================
    // CONTENT DETAILS
    // ========================================
    isContentDetailsUrl: function(url) {
        return url.indexOf("/curso/") !== -1 || 
               url.indexOf("/watch/") !== -1 ||
               url.indexOf("/aula/") !== -1 ||
               url.indexOf("/episodio/") !== -1;
    },
    
    getContentDetails: function(url) {
        log("Getting content details for: " + url);
        
        try {
            // Direct video URLs
            if (url.indexOf("/episodio/") !== -1 || url.indexOf("/aula/") !== -1) {
                return this.getVideoDetails(url);
            }
            
            var html = http.GET(url, {}, false).body;
            
            // Extract basic info
            var title = this.extractTitle(html);
            var description = this.extractDescription(html);
            var thumbnail = this.extractThumbnail(html);
            
            // Course pages with lessons
            if (url.indexOf("/curso/") !== -1) {
                var lessons = this.extractLessons(html);
                return this.buildSeriesDetails(title, description, thumbnail, url, lessons);
            }
            
            // Watch pages redirect to episode
            if (url.indexOf("/watch/") !== -1) {
                var episodeUrl = this.extractEpisodeUrl(html);
                if (episodeUrl) {
                    return this.getVideoDetails(episodeUrl);
                }
            }
            
            // Fallback
            return this.buildVideoDetails(title, description, thumbnail, url, []);
            
        } catch (e) {
            log("Error in getContentDetails: " + e);
            throw new ScriptException("Failed to get content details");
        }
    },
    
    // ========================================
    // VIDEO DETAILS
    // ========================================
    getVideoDetails: function(url) {
        log("Getting video details for: " + url);
        
        try {
            var html = http.GET(url, {}, false).body;
            
            var title = this.extractTitle(html);
            var description = this.extractDescription(html);
            var thumbnail = this.extractThumbnail(html);
            var videoSources = this.extractVideoSources(html);
            
            return this.buildVideoDetails(title, description, thumbnail, url, videoSources);
            
        } catch (e) {
            log("Error in getVideoDetails: " + e);
            throw new ScriptException("Failed to get video details");
        }
    },
    
    // ========================================
    // HELPER: EXTRACT TITLE
    // ========================================
    extractTitle: function(html) {
        var match = html.match(/<h1[^>]*class="entry-title"[^>]*>(.*?)<\/h1>/s);
        if (!match) {
            match = html.match(/<title>(.*?)<\/title>/);
        }
        
        if (match) {
            var title = this.cleanHtml(match[1]);
            // Remove site name after dash
            var dashIndex = title.indexOf('–');
            if (dashIndex !== -1) {
                title = title.substring(0, dashIndex);
            }
            return title.trim();
        }
        
        return "Sem Título";
    },
    
    // ========================================
    // HELPER: EXTRACT DESCRIPTION
    // ========================================
    extractDescription: function(html) {
        var match = html.match(/<div[^>]*class="description"[^>]*>(.*?)<\/div>/s);
        if (!match) {
            match = html.match(/<div[^>]*class="episode_content_wrap"[^>]*>(.*?)<\/div>/s);
        }
        
        return match ? this.cleanHtml(match[1]) : "";
    },
    
    // ========================================
    // HELPER: EXTRACT THUMBNAIL
    // ========================================
    extractThumbnail: function(html) {
        // Try poster first
        var match = html.match(/data-poster=['"]([^'"]*)['"]/);
        if (match) return match[1];
        
        // Try any image in uploads
        match = html.match(/src=['"]([^'"]*uploads[^'"]*\.(?:jpg|jpeg|png|webp)[^'"]*)['"]/i);
        return match ? match[1] : "";
    },
    
    // ========================================
    // HELPER: EXTRACT VIDEO SOURCES
    // ========================================
    extractVideoSources: function(html) {
        var sources = [];
        
        // HLS source
        var hlsMatch = html.match(/const source = ['"]([^'"]*\.m3u8[^'"]*)['"]/);
        if (hlsMatch) {
            sources.push(new HLSSource({
                name: "HLS Stream",
                duration: 0,
                url: hlsMatch[1]
            }));
        }
        
        // MP4 fallback
        var mp4Match = html.match(/video\.src = ['"]([^'"]*\.mp4[^'"]*)['"]/);
        if (mp4Match) {
            sources.push(new VideoUrlSource({
                url: mp4Match[1],
                name: "MP4",
                width: 1280,
                height: 720,
                container: "video/mp4",
                codec: "h264",
                bitrate: 2500000
            }));
        }
        
        return sources;
    },
    
    // ========================================
    // HELPER: EXTRACT LESSONS
    // ========================================
    extractLessons: function(html) {
        var lessons = [];
        var regex = /<div class="ld-item-list-item[^>]*>[\s\S]*?href=['"]([^'"]*\/aula\/[^'"]*)['"]/g;
        var match;
        
        while ((match = regex.exec(html)) !== null) {
            var lessonUrl = match[1];
            var titleMatch = match[0].match(/<div class="ld-item-title">(.*?)<\/div>/s);
            var title = titleMatch ? this.cleanHtml(titleMatch[1]) : "Aula";
            
            lessons.push({
                url: lessonUrl,
                title: title
            });
        }
        
        return lessons;
    },
    
    // ========================================
    // HELPER: EXTRACT EPISODE URL
    // ========================================
    extractEpisodeUrl: function(html) {
        var match = html.match(/href=['"]([^'"]*\/episodio\/[^'"]*)['"]/);
        return match ? match[1] : null;
    },
    
    // ========================================
    // HELPER: EXTRACT SECTION
    // ========================================
    extractSection: function(html, sectionId) {
        var regex = new RegExp('<section[^>]*id="' + sectionId + '"[^>]*>([\\s\\S]*?)<\\/section>', 'i');
        var match = html.match(regex);
        return match ? match[1] : null;
    },
    
    // ========================================
    // HELPER: PARSE VIDEO LIST
    // ========================================
    parseVideoList: function(html) {
        var results = [];
        var regex = /<li[^>]*class="[^"]*(?:slide__item|bb-course-item-wrap)[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
        var match;
        
        while ((match = regex.exec(html)) !== null) {
            var item = match[1];
            
            // Extract URL
            var urlMatch = item.match(/href=['"]([^'"]*(?:curso|watch|aula|episodio)[^'"]*)['"]/);
            if (!urlMatch) continue;
            
            var url = urlMatch[1];
            
            // Extract title
            var titleMatch = item.match(/title=['"]([^'"]*)['"]/i);
            if (!titleMatch) {
                titleMatch = item.match(/<h[23][^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h[23]>/i);
            }
            var title = titleMatch ? this.cleanHtml(titleMatch[1]) : "Sem Título";
            
            // Extract thumbnail
            var thumbMatch = item.match(/src=['"]([^'"]*\.(?:jpg|jpeg|png|webp)[^'"]*)['"]/i);
            var thumbnail = thumbMatch ? thumbMatch[1] : "";
            
            // Create video object
            results.push(new PlatformVideo({
                id: new PlatformID("ICL", url, config.id),
                name: title,
                thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
                author: new PlatformAuthorLink(
                    new PlatformID("ICL", this.baseUrl, config.id),
                    "ICL",
                    this.baseUrl,
                    ""
                ),
                datetime: Math.floor(Date.now() / 1000),
                duration: 0,
                viewCount: 0,
                url: url,
                isLive: false
            }));
        }
        
        return results;
    },
    
    // ========================================
    // HELPER: BUILD VIDEO DETAILS
    // ========================================
    buildVideoDetails: function(title, description, thumbnail, url, videoSources) {
        return new PlatformVideoDetails({
            id: new PlatformID("ICL", url, config.id),
            name: title,
            thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
            author: new PlatformAuthorLink(
                new PlatformID("ICL", this.baseUrl, config.id),
                "ICL",
                this.baseUrl,
                ""
            ),
            datetime: Math.floor(Date.now() / 1000),
            duration: 0,
            viewCount: 0,
            url: url,
            isLive: false,
            description: description,
            video: new VideoSourceDescriptor(videoSources),
            rating: new RatingLikes(0)
        });
    },
    
    // ========================================
    // HELPER: BUILD SERIES DETAILS
    // ========================================
    buildSeriesDetails: function(title, description, thumbnail, url, lessons) {
        var contents = [];
        
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            
            contents.push(new PlatformVideo({
                id: new PlatformID("ICL", lesson.url, config.id),
                name: lesson.title,
                thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
                author: new PlatformAuthorLink(
                    new PlatformID("ICL", this.baseUrl, config.id),
                    "ICL",
                    this.baseUrl,
                    ""
                ),
                datetime: Math.floor(Date.now() / 1000),
                duration: 0,
                viewCount: 0,
                url: lesson.url,
                isLive: false
            }));
        }
        
        return new PlatformVideoDetails({
            id: new PlatformID("ICL", url, config.id),
            name: title,
            thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
            author: new PlatformAuthorLink(
                new PlatformID("ICL", this.baseUrl, config.id),
                "ICL",
                this.baseUrl,
                ""
            ),
            datetime: Math.floor(Date.now() / 1000),
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
    
    // ========================================
    // HELPER: CLEAN HTML
    // ========================================
    cleanHtml: function(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&#8211;/g, '-')
            .replace(/&#8217;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }
};

log("ICL Plugin loaded successfully");
