// ---------- CONFIG ----------
var PLATFORM = "ICL";
var PLATFORM_CLAIMTYPE = 9999;

var config = {
    id: "ICL",
    name: "Instituto Conhecimento Liberta",
    description: "Plugin para acessar conteúdos educacionais do ICL",
    author: "ICL Community",
    authorUrl: "https://icl.com.br",
    sourceUrl: "https://membro.icl.com.br",
    scriptUrl: "./ICLPlugin.js",
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
            options: ["2160p", "1440p", "1080p", "720p", "480p", "360p"]
        }
    ]
};

// ---------- SOURCE ----------
var source = {
    enable: function(conf, settings, savedState) {
        this.baseUrl = "https://membro.icl.com.br";
        this.preferredQuality = settings.preferredDownloadQuality || "1080p";
        log("ICL Plugin v3 enabled");
    },
    
    getHome: function() {
        log("Getting ICL home");
        var html = http.GET(this.baseUrl, {}, false).body;
        var results = [];
        var self = this;
        
        var sections = ["entretenimento", "favoritos", "emprogresso", "novos"];
        for (var i = 0; i < sections.length; i++) {
            var section = self.extractSection(html, 'id="' + sections[i] + '"');
            if (section) {
                var parsed = self.parseVideoList(section);
                for (var j = 0; j < parsed.length; j++) {
                    results.push(parsed[j]);
                }
            }
        }
        
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
        var searchUrl = this.baseUrl + "/?s=" + encodeURIComponent(query);
        var html = http.GET(searchUrl, {}, false).body;
        var results = this.parseVideoList(html);
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
        return url.indexOf("/curso/") >= 0 || 
               url.indexOf("/watch/") >= 0 ||
               url.indexOf("/aula/") >= 0 ||
               url.indexOf("/episodio/") >= 0;
    },
    
    getContentDetails: function(url) {
        log("Getting details: " + url);
        
        if (url.indexOf("/episodio/") >= 0 || url.indexOf("/aula/") >= 0) {
            return this.getVideoDetails(url);
        }
        
        var html = http.GET(url, {}, false).body;
        
        var titleMatch = html.match(/<h1[^>]*class="entry-title"[^>]*>(.*?)<\/h1>/s) ||
                          html.match(/<title>(.*?)<\/title>/);
        var title = titleMatch ? this.cleanHtml(titleMatch[1].split('–')[0]) : "Untitled";
        
        var descMatch = html.match(/<div[^>]*class="description"[^>]*>(.*?)<\/div>/s) ||
                         html.match(/<div[^>]*class="episode_content_wrap"[^>]*>(.*?)<\/div>/s);
        var description = descMatch ? this.cleanHtml(descMatch[1]) : "";
        
        var thumbMatch = html.match(/src=['"]([^'"]*uploads[^'"]*\.(?:jpg|jpeg|png|webp)[^'"]*)['"]/i);
        var thumbnail = thumbMatch ? thumbMatch[1] : "";
        
        if (url.indexOf("/curso/") >= 0) {
            var lessons = this.extractLessons(html, url);
            return this.createSeriesDetails(title, description, thumbnail, url, lessons);
        }
        
        if (url.indexOf("/watch/") >= 0) {
            var episodeLink = html.match(/href=['"]([^'"]*\/episodio\/[^'"]*)['"]/);
            if (episodeLink) {
                return this.getVideoDetails(episodeLink[1]);
            }
        }
        
        return this.createBasicVideoDetails(title, description, thumbnail, url);
    },
    
    getVideoDetails: function(url) {
        log("Getting video from: " + url);
        var html = http.GET(url, {}, false).body;
        
        var titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
        var title = titleMatch ? this.cleanHtml(titleMatch[1]) : "Video";
        
        var descMatch = html.match(/<div[^>]*class="episode_content_wrap"[^>]*>(.*?)<\/div>/s);
        var description = descMatch ? this.cleanHtml(descMatch[1]) : "";
        
        var posterMatch = html.match(/data-poster=['"]([^'"]*)['"]/);
        var thumbnail = posterMatch ? posterMatch[1] : "";
        
        var hlsMatch = html.match(/const source = ['"]([^'"]*\.m3u8[^'"]*)['"]/);
        var mp4Match = html.match(/video\.src = ['"]([^'"]*\.mp4[^'"]*)['"]/);
        
        var videoSources = [];
        
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
    
    createSeriesDetails: function(title, description, thumbnail, url, lessons) {
        var contents = [];
        var self = this;
        
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            contents.push(new PlatformVideo({
                id: new PlatformID(PLATFORM, lesson.url, config.id, PLATFORM_CLAIMTYPE),
                name: lesson.title,
                thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
                author: new PlatformAuthorLink(
                    new PlatformID(PLATFORM, self.baseUrl, config.id, PLATFORM_CLAIMTYPE),
                    "Instituto Conhecimento Liberta",
                    self.baseUrl,
                    ""
                ),
                uploadDate: Math.floor(Date.now() / 1000),
                duration: 0,
                viewCount: 0,
                url: lesson.url,
                isLive: false
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
        var lessons = [];
        var lessonRegex = /<div class="ld-item-list-item[^>]*>[\s\S]*?href=['"]([^'"]*\/aula\/[^'"]*)['"]/g;
        var match;
        var self = this;
        
        while ((match = lessonRegex.exec(html)) !== null) {
            var lessonUrl = match[1];
            var titleMatch = match[0].match(/<div class="ld-item-title">(.*?)<\/div>/s);
            var title = titleMatch ? self.cleanHtml(titleMatch[1]) : "Lesson";
            
            lessons.push({
                url: lessonUrl,
                title: title
            });
        }
        
        return lessons;
    },
    
    extractSection: function(html, sectionId) {
        var regex = new RegExp('<section[^>]*' + sectionId + '[^>]*>([\\s\\S]*?)<\\/section>', 'i');
        var match = html.match(regex);
        return match ? match[1] : null;
    },
    
    parseVideoList: function(html) {
        var results = [];
        var itemRegex = /<li[^>]*class="[^"]*(?:slide__item|bb-course-item-wrap)[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
        var match;
        var self = this;
        
        while ((match = itemRegex.exec(html)) !== null) {
            var item = match[1];
            
            var urlMatch = item.match(/href=['"]([^'"]*(?:curso|watch|aula|episodio)[^'"]*)['"]/);
            if (!urlMatch) continue;
            var url = urlMatch[1];
            
            var titleMatch = item.match(/title=['"]([^'"]*)['"]/i) ||
                              item.match(/<h[23][^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h[23]>/i);
            var title = titleMatch ? self.cleanHtml(titleMatch[1]) : "Untitled";
            
            var thumbMatch = item.match(/src=['"]([^'"]*\.(?:jpg|jpeg|png|webp)[^'"]*)['"]/i);
            var thumbnail = thumbMatch ? thumbMatch[1] : "";
            
            results.push(new PlatformVideo({
                id: new PlatformID(PLATFORM, url, config.id, PLATFORM_CLAIMTYPE),
                name: title,
                thumbnails: thumbnail ? new Thumbnails([new Thumbnail(thumbnail, 0)]) : new Thumbnails([]),
                author: new PlatformAuthorLink(
                    new PlatformID(PLATFORM, self.baseUrl, config.id, PLATFORM_CLAIMTYPE),
                    "Instituto Conhecimento Liberta",
                    self.baseUrl,
                    ""
                ),
                uploadDate: Math.floor(Date.now() / 1000),
                duration: 0,
                viewCount: 0,
                url: url,
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

log("ICL Plugin loaded");
