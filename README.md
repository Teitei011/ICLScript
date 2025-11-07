# Instituto Conhecimento Liberta (ICL) Plugin for Grayjay

A Grayjay plugin to access series, documentaries, and courses from Instituto Conhecimento Liberta (https://membro.icl.com.br/).

## Features

- Browse available courses, series, and documentaries
- Search for content
- Watch videos directly in Grayjay
- Requires ICL membership account

## Installation

### Method 1: Developer Mode (Testing)

1. Install Grayjay app on your Android device
2. Enable developer mode:
   - Open Grayjay
   - Tap "More" tab
   - Tap "Settings"
   - Scroll to bottom
   - Tap "Version Code" multiple times until developer mode is enabled
3. Serve the plugin files locally:
   ```bash
   cd /home/teitei/Documents/ICL-Plugin
   npx serve -p 8080
   ```
4. In Grayjay, go to the Integration tab
5. Enter your local server URL (e.g., `http://YOUR_IP:8080/ICLConfig.json`)
6. Click "Inject Plugin"

### Method 2: Public Deployment

1. Upload `ICLConfig.json`, `ICLScript.js`, and `icl_icon.png` to a public server
2. Update the `sourceUrl` in `ICLConfig.json` to point to your public URL
3. In Grayjay, add the plugin URL in the Sources tab

## Configuration

After installing the plugin, you'll need to configure your ICL account credentials:

1. Go to Grayjay Settings
2. Find the ICL plugin
3. Enter your ICL account email and password

## Files

- `ICLConfig.json` - Plugin configuration and metadata
- `ICLScript.js` - Main plugin implementation
- `icl_icon.png` - Plugin icon (needs to be created)
- `README.md` - This file

## Implementation Notes

### Authentication

The plugin uses WordPress login authentication to access the ICL members area. It stores session cookies after successful login.

### Content Discovery

The plugin parses the HTML of the ICL members area to discover available content. The parsing logic may need to be adjusted based on the actual HTML structure of the ICL website.

### Video Playback

The plugin attempts to detect video sources from:
- Direct `<video>` elements
- Embedded iframes
- HLS streams (.m3u8)
- DASH streams (.mpd)
- Direct MP4 URLs in JavaScript

### Known Limitations

1. **HTML Parsing**: The content parsing relies on specific CSS selectors that may need adjustment based on the actual ICL website structure
2. **Authentication**: The login flow assumes standard WordPress authentication and may need modification
3. **Video Sources**: Video URL extraction depends on how ICL hosts/embeds videos
4. **No Icon**: You need to create or obtain an `icl_icon.png` file for the plugin

## Testing & Refinement

This plugin requires testing with an actual ICL account to:

1. Verify the login/authentication flow works correctly
2. Identify the correct CSS selectors for content parsing
3. Confirm video URL extraction methods
4. Test search functionality
5. Ensure proper video playback

### Debugging Steps

1. Enable developer mode in Grayjay
2. Check the Grayjay logs for any errors
3. Modify the CSS selectors in `ICLScript.js` based on actual HTML structure
4. Test each function (getHome, search, getContentDetails) individually

### Common Issues & Fixes

**Issue**: "Email and password are required"
- **Fix**: Configure credentials in plugin settings

**Issue**: "Login failed: Could not obtain session cookies"
- **Fix**: The login endpoint or method may need adjustment. Inspect network traffic when logging into ICL website manually

**Issue**: "Could not find video source on page"
- **Fix**: The video detection logic needs refinement. Inspect the actual video page HTML to identify correct selectors

**Issue**: Content not showing up in home feed
- **Fix**: CSS selectors for content elements need adjustment. Use browser developer tools to identify correct selectors

## Customization

### Updating Content Selectors

If content isn't being parsed correctly, update the selectors in the `parseContentFromPage` function:

```javascript
// Current selectors
const contentElements = dom.querySelectorAll('.course-item, .video-item, .content-item, article');
const titleElement = element.querySelector('h2, h3, .title, .course-title, .video-title');
const linkElement = element.querySelector('a');
const thumbnailElement = element.querySelector('img');
```

### Adding Categories

To browse specific categories (series, documentaries, courses separately), you can modify the `getHome` function to fetch from specific category URLs.

## API Endpoints

The plugin currently uses these ICL endpoints:

- `/wp-login.php?action=session` - Authentication
- `/membros` - Main members area (home feed)
- `/?s=QUERY` - Search

Additional endpoints may be discovered through network inspection.

## Development

To modify the plugin:

1. Edit `ICLScript.js` for functionality changes
2. Edit `ICLConfig.json` for metadata/configuration changes
3. Increment the `version` number in `ICLConfig.json` after changes
4. Restart the local server and re-inject the plugin in Grayjay

## License

This is a custom plugin for personal use. Respect ICL's terms of service when using this plugin.

## Disclaimer

This plugin is not officially affiliated with or endorsed by Instituto Conhecimento Liberta. Use at your own risk and ensure compliance with ICL's terms of service.

## Support

For issues or improvements:
1. Check Grayjay logs for error messages
2. Inspect the ICL website HTML structure
3. Modify the plugin code accordingly
4. Test thoroughly before deployment

## Next Steps

1. Create an icon file (`icl_icon.png`) - recommended size: 512x512px
2. Test the plugin with a valid ICL account
3. Refine CSS selectors based on actual HTML structure
4. Adjust authentication flow if needed
5. Test video playback with various content types
6. Consider adding code signing for production deployment
