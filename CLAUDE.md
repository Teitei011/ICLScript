# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Grayjay plugin for Instituto Conhecimento Liberta (ICL), a Brazilian educational platform. The plugin enables Grayjay users to access ICL's courses, series, and documentaries through the Grayjay app.

**Base URL**: https://membro.icl.com.br
**Platform**: Android (Grayjay app)
**Language**: JavaScript (Grayjay plugin format)

## Development Commands

### Starting Development Server
```bash
npm start
# Or: npx serve -p 8080
```
This serves the plugin files locally for testing in Grayjay developer mode.

### Testing the Plugin
1. Enable developer mode in Grayjay (tap "Version Code" multiple times in Settings)
2. Start local server with `npm start`
3. In Grayjay Integration tab, inject: `http://YOUR_LOCAL_IP:8080/ICLConfig.json`
4. Configure ICL credentials in plugin settings
5. Test home feed, search, and video playback

## Architecture

### Core Components

**ICLConfig.json** - Plugin manifest
- Defines plugin metadata (name, version, ID)
- Configures WordPress authentication (login URL, cookie names)
- Specifies allowed URLs and required packages (Http, DOMParser)

**ICLScript.js** - Main implementation (340 lines)
- **Authentication**: WordPress cookie-based login (lines 19-43)
  - Uses `bridge.isLoggedIn()` to check auth state
  - Stores session cookies automatically via Grayjay authentication config
- **Content Discovery**: HTML parsing with CSS selectors (lines 46-120)
  - `getHome()`: Fetches `/membros` page and parses content
  - `parseContentFromPage()`: Extracts video metadata from DOM
- **Video Playback**: Multi-format detection (lines 164-289)
  - `getContentDetails()`: Extracts video sources from page HTML/scripts
  - Supports HLS (.m3u8), DASH (.mpd), and direct MP4 URLs
- **Search**: WordPress built-in search (lines 132-149)

### Authentication Flow

1. User configures email/password in Grayjay plugin settings
2. Grayjay handles WordPress login via config (`authentication.loginUrl`)
3. Session cookies (`wordpress_logged_in`) stored by Grayjay
4. Plugin uses `bridge.isLoggedIn()` to verify authentication
5. All requests include stored cookies automatically

### Content Parsing Strategy

The plugin uses **generic CSS selectors** that need refinement based on actual ICL HTML structure:

```javascript
// Content containers - may need adjustment
'.course-item, .video-item, .content-item, article'

// Metadata elements - generic fallbacks
'h2, h3, .title, .course-title, .video-title'  // Titles
'img'  // Thumbnails
'a'  // Links
```

**Important**: These selectors are **estimates**. When debugging content discovery issues, inspect the actual ICL HTML structure and update selectors in `parseContentFromPage()` (ICLScript.js:73).

### Video Source Detection

Multi-layered approach to find video URLs:

1. Direct `<video>` elements (lines 184-204)
2. Embedded iframes (lines 205-221)
3. JavaScript inspection for:
   - HLS streams: `.m3u8` URLs (lines 224-236)
   - DASH streams: `.mpd` URLs (lines 238-246)
   - Direct MP4 URLs (lines 248-261)

## Critical Implementation Details

### URL Pattern Matching

Content URLs must match patterns in `isContentDetailsUrl()` (ICLScript.js:157):
```javascript
url.includes("/curso/") || url.includes("/video/") ||
url.includes("/aula/") || url.includes("/serie/") ||
url.includes("/documentario/")
```
Add new patterns if ICL uses different URL structures.

### Grayjay API Objects

The plugin creates specific Grayjay types:
- `PlatformVideo` - Feed items (lines 98-108)
- `PlatformVideoDetails` - Full video details (lines 269-283)
- `PlatformID` - Unique identifiers (format: PLATFORM + URL + config.id)
- `VideoSourceDescriptor` - Contains array of video sources
- `ContentPager` - Paginated results wrapper

### Error Handling Pattern

Always wrap in try-catch and return safe defaults:
```javascript
try {
    // Attempt operation
} catch (e) {
    log("Error: " + e.message);
    return new ContentPager([], false); // Empty pager
}
```

## Common Debugging Scenarios

### Issue: Content not appearing in home feed
**Solution**: Inspect ICL `/membros` page HTML in browser
- Find actual CSS selectors for content containers
- Update `parseContentFromPage()` selectors (ICLScript.js:73)
- Test with: log(contentElements.length) to verify selection

### Issue: Video playback fails
**Solution**: Inspect video page source
- Check for HLS/DASH/MP4 URLs in `<script>` tags
- Look for iframe embeds or `<video>` elements
- Update video detection regex in `getContentDetails()` (ICLScript.js:224-261)
- Common patterns: `src="(https://.*\.m3u8)"` or `file:"(.*\.mp4)"`

### Issue: Authentication failures
**Solution**: Verify WordPress login flow
- Check if ICL uses standard `/wp-login.php` endpoint
- Inspect browser network traffic during manual login
- Verify cookie names match `authentication.cookiesToFind` in config
- May need to handle CSRF tokens or custom auth flow

## File Structure Reference

```
ICL-Plugin/
├── ICLConfig.json       # Plugin manifest (authentication, URLs, metadata)
├── ICLScript.js         # Core implementation (parsing, video detection)
├── package.json         # npm scripts (npm start)
├── icl_icon.png        # 512x512px plugin icon
├── README.md           # Full documentation
├── TESTING.md          # Testing procedures
└── PLUGIN_SUMMARY.md   # Implementation overview
```

## Important Constraints

1. **No official ICL API** - All data extraction via HTML parsing
2. **WordPress authentication** - Assumes standard WordPress login flow
3. **Selector fragility** - CSS selectors may break with ICL website updates
4. **No channel support** - ICL doesn't have traditional channels (returns not supported)
5. **No comments** - Returns empty CommentPager (ICL may not have comments)

## Version Management

When modifying the plugin:
1. Edit ICLScript.js for functionality changes
2. Edit ICLConfig.json for configuration changes
3. **Increment `version` number** in ICLConfig.json (currently: 3)
4. Restart local server and re-inject plugin in Grayjay

## Plugin ID
**ID**: `a1b2c3d4-5678-9abc-def0-123456789abc`
This UUID must remain consistent across versions.
