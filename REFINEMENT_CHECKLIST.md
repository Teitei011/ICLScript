# Plugin Refinement Checklist

Use this checklist when testing and refining the ICL plugin.

## Phase 1: Initial Setup ✓

- [x] Create ICLConfig.json
- [x] Create ICLScript.js
- [x] Create documentation files
- [ ] Create icl_icon.png (512x512px)

## Phase 2: Local Testing

### Environment Setup
- [ ] Install Node.js
- [ ] Navigate to plugin directory
- [ ] Run `npm start` successfully
- [ ] Note local IP address
- [ ] Confirm computer and phone on same network

### Grayjay Setup
- [ ] Install Grayjay on Android
- [ ] Enable developer mode
- [ ] Go to Integration tab
- [ ] Inject plugin URL: `http://YOUR_IP:8080/ICLConfig.json`
- [ ] Confirm plugin appears in Sources

### Authentication
- [ ] Enter ICL email in plugin settings
- [ ] Enter ICL password in plugin settings
- [ ] Enable ICL source
- [ ] Check logs for authentication attempt
- [ ] Confirm "Successfully logged in" message

**If authentication fails:**
- [ ] Inspect ICL login page HTML
- [ ] Check network traffic during manual login
- [ ] Note actual login endpoint URL
- [ ] Check if CSRF tokens are required
- [ ] Update login method in ICLScript.js (line 30-65)

## Phase 3: Content Discovery

### Home Feed
- [ ] Open Grayjay home feed
- [ ] Check if ICL content appears
- [ ] Verify titles display correctly
- [ ] Verify thumbnails load
- [ ] Check if at least some content shows

**If home feed is empty:**
- [ ] Login to membro.icl.com.br in browser
- [ ] Navigate to /membros page
- [ ] Right-click → Inspect Element
- [ ] Find content container elements
- [ ] Note the CSS classes/IDs used
- [ ] Update selectors in `parseContentFromPage()` (line 96-158)

**Common selectors to check:**
```javascript
// Content containers - current guess:
'.course-item, .video-item, .content-item, article'

// Likely alternatives based on WordPress themes:
'.post', '.entry', '.course-card', '.video-card',
'.grid-item', '.content-block', '[class*="course"]',
'[class*="video"]', '.elementor-post'

// Update line 105 in ICLScript.js with correct selector
```

### Thumbnails
- [ ] Thumbnails display in feed
- [ ] Thumbnails are correct for each item
- [ ] No broken image icons

**If thumbnails broken:**
- [ ] Check img src attribute in browser inspector
- [ ] Update line 114: `thumbnailElement.getAttribute('src')`
- [ ] May need: `getAttribute('data-src')` or `getAttribute('data-lazy')`

### Titles & Links
- [ ] Titles are readable and accurate
- [ ] Clicking items opens video details
- [ ] URLs are correctly formed

**If titles/links broken:**
- [ ] Inspect title elements in browser
- [ ] Update line 110: title selector
- [ ] Inspect link elements
- [ ] Update line 111: link selector

## Phase 4: Video Playback

### Video Details Page
- [ ] Click on a video from feed
- [ ] Video details page loads
- [ ] Title displays correctly
- [ ] Description shows up
- [ ] Thumbnail loads

**If video details fail:**
- [ ] Open a video page in browser
- [ ] Inspect page source
- [ ] Note video title location
- [ ] Note description location
- [ ] Update selectors in `getContentDetails()` (line 191-203)

### Video Source Detection
- [ ] Attempt to play video
- [ ] Video player appears
- [ ] Video actually plays
- [ ] Audio works

**If video doesn't play:**

Step 1: Identify video hosting method
- [ ] Open video page in browser
- [ ] Right-click page → View Page Source
- [ ] Search for: `.mp4`, `.m3u8`, `.mpd`, `video src`, `iframe`
- [ ] Check browser Network tab while playing video
- [ ] Note the actual video URL format

Step 2: Update detection logic (line 210-273)

For direct video element:
```javascript
// Check if video is in a <video> tag
const videoElement = dom.querySelector('video source');
```

For iframe embed:
```javascript
// Check if embedded (Vimeo, Wistia, etc.)
const iframeElement = dom.querySelector('iframe[src*="player"]');
```

For HLS stream:
```javascript
// Look for .m3u8 URL in page scripts
const hlsMatch = scriptContent.match(/(https?:\/\/[^\s"']+\.m3u8)/);
```

For DASH stream:
```javascript
// Look for .mpd URL
const dashMatch = scriptContent.match(/(https?:\/\/[^\s"']+\.mpd)/);
```

Step 3: Common video platforms
- [ ] Vimeo embed? Look for: `iframe[src*="vimeo.com"]`
- [ ] YouTube embed? Look for: `iframe[src*="youtube.com"]`
- [ ] Wistia? Look for: `class*="wistia"` or `data-wistia-id`
- [ ] Custom player? Check JavaScript for player initialization

Step 4: Test each video type
- [ ] Test a course video
- [ ] Test a documentary
- [ ] Test a series episode
- [ ] Test different content types

## Phase 5: Search Functionality

### Basic Search
- [ ] Click search in Grayjay
- [ ] Enter search term
- [ ] Results appear
- [ ] Results are relevant

**If search fails:**
- [ ] Test search on membro.icl.com.br manually
- [ ] Note the search URL format
- [ ] Check if it's `/?s=query` or custom endpoint
- [ ] Update line 140-153 in ICLScript.js

### Advanced Search (Optional)
- [ ] Search for specific course name
- [ ] Search for instructor name
- [ ] Search by category
- [ ] Filter results

## Phase 6: Error Handling

### Test Error Cases
- [ ] Wrong password - shows clear error?
- [ ] Network disconnected - handles gracefully?
- [ ] Invalid video URL - shows error message?
- [ ] Empty search results - handles properly?

### Check Logs
- [ ] Open Grayjay Integration → Testing tab
- [ ] Trigger each function (home, search, video)
- [ ] Review log messages
- [ ] No unexpected errors?

## Phase 7: Performance

### Loading Speed
- [ ] Home feed loads in < 5 seconds?
- [ ] Video details load quickly?
- [ ] Search is responsive?

### Memory Usage
- [ ] Scroll through many videos
- [ ] Play multiple videos
- [ ] No crashes or freezes?

## Phase 8: Edge Cases

### Content Variety
- [ ] Test with different video lengths
- [ ] Test with various content types
- [ ] Test with special characters in titles
- [ ] Test with missing thumbnails

### Network Conditions
- [ ] Test on WiFi
- [ ] Test on mobile data
- [ ] Test with slow connection

## Phase 9: Polish

### User Experience
- [ ] Error messages are helpful?
- [ ] Loading states are clear?
- [ ] Navigation is intuitive?

### Metadata
- [ ] Durations shown if available?
- [ ] View counts if available?
- [ ] Upload dates if available?

## Phase 10: Production Ready

### Final Checks
- [ ] All core features working
- [ ] No critical bugs
- [ ] Icon file created and looks good
- [ ] Documentation is accurate
- [ ] Version number updated

### Deployment (Optional)
- [ ] Upload to public server
- [ ] Update sourceUrl in config
- [ ] Test from public URL
- [ ] Consider code signing
- [ ] Share with community

## Notes Section

Use this space to track issues and solutions:

### Issue Log
```
Date:
Issue:
Solution:

Date:
Issue:
Solution:
```

### Selector Updates
```
Original selector:
New selector:
Reason:
Line number:
```

### Video URL Patterns Found
```
Pattern 1:
Pattern 2:
Pattern 3:
```

## Quick Reference Commands

```bash
# Start local server
cd /home/teitei/Documents/ICL-Plugin && npm start

# Check logs
# In Grayjay: Integration → Testing tab

# Reload plugin after changes
# In Grayjay: Integration → Reload

# Test single function
# In Grayjay: Integration → Testing → Select function → Test
```

## Need Help?

1. Check TESTING.md for detailed debugging steps
2. Review README.md for full documentation
3. Inspect browser HTML for correct selectors
4. Check Grayjay logs for error messages
5. Review example plugins: https://github.com/grayjay-sources

---

**Remember**: This plugin is a starting point. The ICL website structure may differ from assumptions. Testing and refinement is essential!
