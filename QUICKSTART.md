# Quick Start Guide

Get the ICL plugin running in Grayjay in 5 minutes!

## 1. Install Node.js

If you don't have Node.js:
- Download from https://nodejs.org/
- Or use your package manager: `sudo dnf install nodejs` (Fedora)

## 2. Start the Local Server

```bash
cd /home/teitei/Documents/ICL-Plugin
npm start
```

You should see:
```
Serving!
- Local:    http://localhost:8080
- Network:  http://192.168.x.x:8080
```

Note the Network IP address.

## 3. Setup Grayjay (First Time Only)

On your Android device:

1. Install Grayjay from https://grayjay.app/
2. Open Grayjay
3. Tap "More" → "Settings"
4. Scroll down and tap "Version Code" 5-7 times
5. You should see "Developer mode enabled"

## 4. Inject the Plugin

1. In Grayjay, go to "Integration" tab
2. Enter: `http://YOUR_IP:8080/ICLConfig.json`
   - Replace YOUR_IP with the Network IP from step 2
   - Example: `http://192.168.1.100:8080/ICLConfig.json`
3. Tap "Inject Plugin"
4. Go to "Sources" tab
5. You should see "Instituto Conhecimento Liberta" plugin

## 5. Configure Your Account

1. Tap "More" → "Settings"
2. Find "Instituto Conhecimento Liberta"
3. Enter your ICL email and password
4. Save

## 6. Use the Plugin

1. Go to "Sources" tab
2. Enable the ICL source
3. Browse available content!

## Troubleshooting

**Plugin not showing up?**
- Make sure your device and computer are on the same WiFi
- Check firewall settings
- Try `http://` not `https://`

**Can't inject plugin?**
- Verify the URL is correct
- Make sure the server is running (check terminal)
- Try pinging the IP from your phone's browser

**Content not loading?**
- Check TESTING.md for detailed debugging
- The plugin may need refinement for ICL's specific HTML structure
- See Grayjay logs in Integration > Testing tab

**Authentication errors?**
- Double-check your ICL credentials
- Make sure your ICL account is active
- Check logs for specific error messages

## Next Steps

Once it's working:
- Read TESTING.md for comprehensive testing guide
- Refine selectors based on actual ICL HTML structure
- Report issues or improvements

## Development Workflow

1. Make changes to `ICLScript.js` or `ICLConfig.json`
2. In Grayjay Integration tab, tap "Reload"
3. Test your changes
4. Repeat!

Remember to increment `version` in `ICLConfig.json` after changes.

## Need the Full Guide?

See README.md for complete documentation.
