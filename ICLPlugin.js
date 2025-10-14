// ---------- CONFIG ----------
const PLATFORM        = 'ICL';
const PLATFORM_CLAIMTYPE  = 9999;

const config = {
    id            : 'ICL',
    name          : 'Instituto Conhecimento Liberta',
    description   : 'Plugin para acessar conteúdos educacionais do ICL',
    author        : 'ICL Community',
    authorUrl     : 'https://icl.com.br',
    sourceUrl     : 'https://membro.icl.com.br',
    scriptUrl     : './ICLPlugin.js',   // entry-point itself
    version       : 3,
    iconUrl       : 'https://membro.icl.com.br/app/uploads/2024/03/cropped-favicon-192x192.png',

    authentication: {
        userLoginUrl : 'https://membro.icl.com.br/wp-login.php',
        completionUrl: 'https://membro.icl.com.br',
        cookiesToFind: ['wordpress_logged_in']
    },

    capabilities: {
        types : ['MEDIA_VIDEO_TYPE'],
        sorts : ['SORT_CHRONOLOGICAL'],
        filters: []
    },

    settings: [
        {
            variable   : 'preferredDownloadQuality',
            name       : 'Qualidade de Download Preferida',
            description: 'Escolha a qualidade para downloads',
            type       : 'dropdown',
            default    : '1080p',
            options    : ['2160p','1440p','1080p','720p','480p','360p']
        }
    ]
};

// ---------- SOURCE ----------
const script = require('./ICLScript.js');   // <-- delegate all work

const source = {
    enable(conf, settings, saved) {
        script.enable(conf, settings, saved);
    },

    getHome() {
        return script.getHome();
    },

    search(query, type, order, filters) {
        return script.search(query, type, order, filters);
    },

    getSearchCapabilities() {
        return script.getSearchCapabilities();
    },

    searchSuggestions(query) {
        return script.searchSuggestions(query);
    },

    isChannelUrl(url) {
        return script.isChannelUrl(url);
    },

    getChannel(url) {
        return script.getChannel(url);
    },

    getChannelContents(url) {
        return script.getChannelContents(url);
    },

    getSearchChannelContents(channelUrl, query, type, order, filters) {
        return script.getSearchChannelContents(channelUrl, query, type, order, filters);
    },

    isContentDetailsUrl(url) {
        return script.isContentDetailsUrl(url);
    },

    getContentDetails(url) {
        return script.getContentDetails(url);
    },

    // download support
    getVideoDownload(url) {
        return script.getVideoDownload(url);
    }
};

// ---------- EXPORT ----------
module.exports = { config, source };
