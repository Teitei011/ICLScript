// ---------- CONFIG ----------
var PLATFORM = "ICL";
var PLATFORM_CLAIMTYPE = 9999;

// ============================================
// CONFIGURATION
// ============================================
var config = {
    name: "Instituto Conhecimento Liberta",
    description: "Plugin para acessar conteúdos educacionais do ICL",
    author: "ICL Community",
    authorUrl: "https://icl.com.br",
    
    sourceUrl: "https://membro.icl.com.br/ICLConfig.json",
    repositoryUrl: "https://github.com/iclcommunity/grayjay-icl",
    scriptUrl: "./ICLPlugin.js",
    version: 1,
    
    iconUrl: "https://membro.icl.com.br/app/uploads/2024/03/cropped-favicon-192x192.png",
    
    id: "b3bcdda8-6ed1-4bcd-a6d9-e5fb5c3d62a8",
    
    scriptSignature: "",
    scriptPublicKey: "",
    
    packages: ["Http", "DOMParser"],
    
    allowEval: false,
    
    allowUrls: [
        "membro.icl.com.br"
    ]
};

// ============================================
// SOURCE IMPLEMENTATION
// ============================================
var source = {
    
    enable: function(config, settings, savedState) {
        this.baseUrl = "https://membro.icl.com.br";
        log("ICL Plugin enabled");
    },
    
    getHome: function() {
        log("Getting home page");
        
        try {
            var resp = http.GET(this.baseUrl, {}, false);
            var html = resp.body;
            var results = [];
            
            var sectionIds = ["entretenimento", "favoritos", "emprogresso", "novos"];
            
            for (var i = 0; i < sectionIds.length; i++) {
                var sectionHtml = this.extractSectionById(html, sectionIds[i]);
                if (sectionHtml) {
                    var videos = this.parseVideoItems(sectionHtml);
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
        log("Searching: " + query);
        
        try {
            var searchUrl = this.baseUrl + "/?s=" + encodeURIComponent(query);
            var resp = http.GET(searchUrl, {}, false);
            var results = this.parseVideoItems(resp.body);
            
            return new VideoPager(results, false);
            
        } catch (e) {
            log("Error in search: " + e);
            return new VideoPager([], false);
        }
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
    
    getChannelContents: function(url, type, order, filters) {
        throw new ScriptException("Channels not supported");
    },
    
    isContentDetailsUrl: function(url) {
        return url.indexOf("/curso/") >= 0 || 
               url.indexOf("/watch/") >= 0 ||
               url.indexOf("/aula/") >= 0 ||
               url.indexOf("/episodio/") >= 0;
    },
    
    getContentDetails: function(url) {
        log("Getting content details: " + url);
        
        try {
            if (url.indexOf("/episodio/") >= 0 || url.indexOf("/aula/") >= 0) {
                return this.getVideoContent(url);
            }
            
            var resp = http.GET(url, {}, false);
            var html = resp.body;
            
            var title = this.extractTitle(html);
            var description = this.extractDescription(html);
            var thumbnail = this.extractThumbnail(html);
            
            if (url.indexOf("/curso/") >= 0) {
                var lessons = this.extractLessonList(html);
                return this.buildSeriesContent(title, description, thumbnail, url, lessons);
            }
            
            if (url.indexOf("/watch/") >= 0) {
                var episodeUrl = this.findEpisodeUrl(html);
                if (episodeUrl) {
                    return this.getVideoContent(episodeUrl);
                }
            }
            
            return this.buildVideoContent(title, description, thumbnail, url, []);
            
        } catch (e) {
            log("Error in getContentDetails: " + e);
            throw new ScriptException("Failed to get content");
        }
    },
    
    getVideoContent: function(url) {
        log("Getting video: " + url);
        
        var resp = http.GET(url, {}, false);
        var html = resp.body;
        
        var title = this.extractTitle(html);
        var description = this.extractDescription(html);
        var thumbnail = this.extractThumbnail(html);
        var sources = this.extractVideoSources(html);
        
        return this.buildVideoContent(title, description, thumbnail, url, sources);
    },
    
    extractTitle: function(html) {
        var match = html.match(/<h1[^>]*class="entry-title"[^>]*>(.*?)<\/h1>/s);
        if (!match) {
            match = html.match(/<title>(.*?)<\/title>/);
        }
        
        if (match) {
            var title = this.stripHtml(match[1]);
            var dash = title.indexOf('–');
            if (dash >= 0) {
                title = title.substring(0, dash);
            }
            return title.replace(/\s+/g, ' ').trim();
        }
        
        return "Sem Título";
    },
    
    extractDescription: function(html) {
        var match = html.match(/<div[^>]*class="description"[^>]*>(.*?)<\/div>/s);
        if (!match) {
            match = html.match(/<div[^>]*class="episode_content_wrap"[^>]*>(.*?)<\/div>/s);
        }
        return match ? this.stripHtml(match[1]) : "";
    },
    
    extractThumbnail: function(html) {
        var match = html.match(/data-poster=['"]([^'"]*)['"]/);
        if (match) return match[1];
        
        match = html.match(/src=['"]([^'"]*uploads[^'"]*\.(?:jpg|png|webp)[^'"]*)['"]/i);
        return match ? match[1] : "";
    },
    
    extractVideoSources: function(html) {
        var sources = [];
        
        var hlsMatch = html.match(/const source = ['"]([^'"]*\.m3u8[^'"]*)['"]/);
        if (hlsMatch) {
            sources.push(new HLSSource({
                name: "HLS",
                duration: 0,
                url: hlsMatch[1]
            }));
        }
        
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
    
    extractLessonList: function(html) {
        var lessons = [];
        var regex = /<div class="ld-item-list-item[^>]*>[\s\S]*?href=['"]([^'"]*\/aula\/[^'"]*)['"]/g;
        var match;
        
        while ((match = regex.exec(html)) !== null) {
            var lessonUrl = match[1];
            var titleMatch = match[0].match(/<div class="ld-item-title">(.*?)<\/div>/s);
            var title = titleMatch ? this.stripHtml(titleMatch[1]) : "Aula";
            
            lessons.push({ url: lessonUrl, title: title });
        }
        
        return lessons;
    },
    
    findEpisodeUrl: function(html) {
        var match = html.match(/href=['"]([^'"]*\/episodio\/[^'"]*)['"]/);
        return match ? match[1] : null;
    },
    
    extractSectionById: function(html, sectionId) {
        var regex = new RegExp('<section[^>]*id="' + sectionId + '"[^>]*>([\\s\\S]*?)<\\/section>', 'i');
        var match = html.match(regex);
        return match ? match[1] : null;
    },
    
    parseVideoItems: function(html) {
        var results = [];
        var regex = /<li[^>]*class="[^"]*(?:slide__item|bb-course-item-wrap)[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
        var match;
        
        while ((match = regex.exec(html)) !== null) {
            var item = match[1];
            
            var urlMatch = item.match(/href=['"]([^'"]*(?:curso|watch|aula|episodio)[^'"]*)['"]/);
            if (!urlMatch) continue;
            
            var url = urlMatch[1];
            
            var titleMatch = item.match(/title=['"]([^'"]*)['"]/i);
            if (!titleMatch) {
                titleMatch = item.match(/<h[23][^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h[23]>/i);
            }
            var title = titleMatch ? this.stripHtml(titleMatch[1]) : "Sem Título";
            
            var thumbMatch = item.match(/src=['"]([^'"]*\.(?:jpg|png|webp)[^'"]*)['"]/i);
            var thumbnail = thumbMatch ? thumbMatch[1] : "";
            
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
    
    buildVideoContent: function(title, description, thumbnail, url, videoSources) {
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
    
    buildSeriesContent: function(title, description, thumbnail, url, lessons) {
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
    
    stripHtml: function(html) {
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

log("ICL Plugin loaded");
