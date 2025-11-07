# Testing Guide for ICL Grayjay Plugin

This guide will help you test and refine the ICL plugin for Grayjay.

## Prerequisites

- Grayjay app installed on Android device
- Active ICL membership account
- Computer and Android device on the same network
- Node.js installed (for running local server)

## Step 1: Enable Developer Mode

1. Open Grayjay app
2. Tap "More" tab
3. Tap "Settings"
4. Scroll to bottom
5. Tap "Version Code" repeatedly until developer mode activates

## Step 2: Start Local Server

```bash
cd /home/teitei/Documents/ICL-Plugin
npm start
# Or manually: npx serve -p 8080
```

Note your computer's local IP address (e.g., 192.168.1.100)

## Step 3: Inject Plugin

1. In Grayjay, go to Integration tab
2. Enter URL: `http://YOUR_IP:8080/ICLConfig.json`
   - Example: `http://192.168.1.100:8080/ICLConfig.json`
3. Click "Inject Plugin"
4. The ICL plugin should appear in Sources tab

## Step 4: Configure Credentials

1. Go to Settings in Grayjay
2. Find ICL plugin
3. Enter your ICL email and password

## Step 5: Test Basic Functionality

### Test 1: Home Feed

1. Go to Sources tab
2. Enable ICL source
3. Check if content appears in home feed
4. **Expected**: List of courses/videos from ICL
5. **If fails**: Check logs, update CSS selectors in `parseContentFromPage()`

### Test 2: Authentication

1. Watch for authentication in logs
2. **Expected**: "Successfully logged in to ICL" message
3. **If fails**: Inspect login request/response, may need to adjust login flow

### Test 3: Content Details

1. Click on a video from home feed
2. Check if video details load
3. **Expected**: Video title, description, thumbnail, and playback
4. **If fails**: Inspect video page HTML, update selectors in `getContentDetails()`

### Test 4: Video Playback

1. Attempt to play a video
2. **Expected**: Video plays successfully
3. **If fails**: Check video source detection logic, may need to identify correct video URL format

### Test 5: Search

1. Search for a course/video name
2. **Expected**: Relevant results appear
3. **If fails**: Check WordPress search endpoint, may need custom search logic

## Debugging

### View Logs

In Grayjay developer mode, check the Testing tab for logs from the plugin.

### Common Debug Points

1. **Authentication Issues**
   - Check if cookies are being set correctly
   - Inspect network traffic during manual login
   - May need to handle CSRF tokens

2. **Content Not Appearing**
   - Use browser to inspect ICL members page HTML
   - Identify correct CSS selectors for content containers
   - Update selectors in `parseContentFromPage()`

3. **Video Not Playing**
   - Inspect video page source in browser
   - Look for video URLs in HTML/JavaScript
   - Check for HLS (.m3u8), DASH (.mpd), or MP4 URLs
   - Update video detection logic in `getContentDetails()`

### Inspecting HTML Structure

To find correct selectors:

1. Login to https://membro.icl.com.br/ in browser
2. Navigate to members area
3. Right-click and "Inspect Element"
4. Find content containers and note CSS classes/IDs
5. Update plugin selectors accordingly

Example selectors to look for:
```javascript
// Content containers
.course-item, .video-card, .content-box, article, .post

// Titles
h2, h3, .title, .course-title, .entry-title

// Links
a[href*="/curso/"], a[href*="/video/"]

// Thumbnails
img, .thumbnail, .course-image

// Video elements
video source, iframe[src*="player"], script (for URLs)
```

### Network Inspection

Use browser Developer Tools > Network tab while:
1. Logging in
2. Browsing content
3. Playing videos

Look for:
- Login endpoint and payload format
- API endpoints for content lists
- Video streaming URLs

## Refinement Checklist

- [ ] Login authentication works
- [ ] Home feed displays content
- [ ] Content thumbnails load
- [ ] Content details page works
- [ ] Video playback works
- [ ] Search returns results
- [ ] Multiple video formats supported (HLS, MP4, etc.)
- [ ] Error handling works properly

## Common Fixes

### Fix 1: Update Login Endpoint

If WordPress login doesn't work:

```javascript
// Try alternative login methods
// Check actual login form on ICL website
const loginData = new FormData();
loginData.append('log', userEmail);
loginData.append('pwd', userPassword);
```

### Fix 2: Update Content Selectors

Based on actual HTML:

```javascript
// Example: If ICL uses custom classes
const contentElements = dom.querySelectorAll('.icl-course-card');
const titleElement = element.querySelector('.icl-title');
```

### Fix 3: Handle Video Embeds

If videos are embedded from external platforms:

```javascript
// Check for Vimeo, YouTube, Wistia, etc.
const vimeoEmbed = element.querySelector('iframe[src*="vimeo"]');
if (vimeoEmbed) {
    // Extract Vimeo ID and construct proper URL
}
```

## Production Deployment

Once testing is successful:

1. Create/obtain proper icon file (512x512px PNG)
2. Upload files to public server
3. Update `sourceUrl` in config
4. Consider code signing for security
5. Share plugin URL with others

## Need Help?

- Check Grayjay plugin documentation: https://gitlab.futo.org/videostreaming/grayjay/-/blob/master/plugin-development.md
- Inspect example plugins: https://github.com/grayjay-sources
- Review browser network/console for ICL website behavior

## Reporting Issues

When reporting issues, include:
1. Error message from Grayjay logs
2. Steps to reproduce
3. Expected vs actual behavior
4. Any relevant HTML structure from ICL website
