# 📸 Screenshot Capture Guide

This guide helps you capture screenshots for the README documentation.

## Required Screenshots

Capture the following screenshots and save them in this folder:

| Filename | Tab/Screen | What to Show |
|----------|------------|--------------|
| `home-dashboard.png` | Home | Full home page with features, architecture, status cards |
| `web-services.png` | Web Services | Form filled with sample API test configuration |
| `scheduled-jobs.png` | Scheduled Jobs | Form with process ID and test running status |
| `event-streams.png` | Event Streams | Form with topic, token, and message payload |
| `ai-agents.png` | AI Agents | Form with web service API configuration |
| `cicd.png` | CI/CD | Pipeline tab with environments and deployment options |
| `test-results.png` | Test Results | Multiple test results with pass/fail status |
| `test-suite.png` | Test Suite | Saved tests list with run all button |

## Screenshot Tips

### 1. Browser Setup
- Use Chrome or Firefox
- Set browser width to ~1400px for consistent sizing
- Use dark mode (the app is dark themed)

### 2. Capture Method

**Mac:**
```bash
# Full window
Cmd + Shift + 4, then Space, click window

# Selection
Cmd + Shift + 4, drag to select
```

**Windows:**
```bash
# Full window
Alt + Print Screen

# Selection (Windows 10/11)
Win + Shift + S
```

**Linux:**
```bash
# Using gnome-screenshot
gnome-screenshot -w  # Window
gnome-screenshot -a  # Area selection
```

### 3. Recommended Content for Each Screenshot

#### home-dashboard.png
- Show the full home page
- Backend should be connected (green status)
- Some test results in statistics

#### web-services.png
- Fill in a sample GET request
- URL: `https://api.example.com/users`
- Auth: Bearer Token
- Add 1-2 assertions
- Show the form fully visible

#### scheduled-jobs.png
- Enter a sample Process ID
- Set expected status to COMPLETE
- Optionally show a running test status

#### event-streams.png
- Select "Single Message" format
- Enter a sample API URL
- Add a JSON payload with `{{uuid}}` dynamic value
- Show message properties section

#### ai-agents.png
- Select "Web Service API" test type
- Fill in endpoint URL
- Show request body template with `{{prompt}}`
- Add expected behavior JSON

#### cicd.png
- Show the Pipeline tab selected
- Enter a component ID
- Show environment dropdown if possible
- Display some activity log entries

#### test-results.png
- Run a few tests first (mix of pass/fail)
- Expand one result to show assertions
- Show the response data section

#### test-suite.png
- Save 3-4 tests to the suite
- Show the test list with different types
- Include the "Run All Tests" button

## Image Optimization

After capturing, optimize images for web:

```bash
# Using ImageMagick (resize to max 1200px width)
convert input.png -resize 1200x\> -quality 85 output.png

# Using pngquant (compress PNG)
pngquant --quality=65-80 screenshot.png
```

## Alternative: GIF Recordings

For dynamic features, consider recording GIFs:

```bash
# Using Gifox (Mac)
# Using ScreenToGif (Windows)
# Using Peek (Linux)
```

Recommended for:
- Scheduled job polling animation
- Test execution flow
- CI/CD pipeline progress

## File Size Guidelines

| Type | Max Size | Format |
|------|----------|--------|
| Screenshot | 500KB | PNG |
| GIF | 2MB | GIF |

---

Once you've captured all screenshots, they will automatically appear in the README!
