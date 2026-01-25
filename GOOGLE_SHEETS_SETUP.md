# Google Sheets Analytics Setup

This guide will help you set up Google Sheets to track golf game usage data.

## Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Swamp Darts Analytics" (or whatever you prefer)
4. Create the following column headers in Row 1:
   - A1: `Timestamp`
   - B1: `Player Names`
   - C1: `Device Type`
   - D1: `Screen Type`
   - E1: `Course Name`
   - F1: `Variant`
   - G1: `Winner`
   - H1: `Won By Tiebreaker`
   - I1: `Player 1 Name`
   - J1: `Player 1 Total`
   - K1: `Player 1 Holes (1-18)`
   - L1: `Player 2 Name`
   - M1: `Player 2 Total`
   - N1: `Player 2 Holes (1-18)`
   - O1: `Player 3 Name`
   - P1: `Player 3 Total`
   - Q1: `Player 3 Holes (1-18)`
   - R1: `Player 4 Name`
   - S1: `Player 4 Total`
   - T1: `Player 4 Holes (1-18)`
   - U1: `User Agent`
   - V1: `Screen Resolution`
   - W1: `Locale`

## Step 2: Create the Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code in the editor
3. Copy and paste the following script:

```javascript
function doPost(e) {
  try {
    // Get the active spreadsheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Parse the incoming JSON data
    var data = JSON.parse(e.postData.contents);

    // Prepare the row data
    var row = [
      data.timestamp,
      data.playerNames.join(', '),
      data.deviceInfo,
      data.screenType,
      data.courseName,
      data.variant,
      data.winner,
      data.wonByTieBreaker ? 'Yes' : 'No'
    ];

    // Add up to 4 players' data
    for (var i = 0; i < 4; i++) {
      if (data.holeScores[i]) {
        row.push(data.holeScores[i].playerName);
        row.push(data.holeScores[i].totalScore);
        row.push(data.holeScores[i].holes.join(','));
      } else {
        row.push(''); // Player name
        row.push(''); // Total score
        row.push(''); // Holes
      }
    }

    // Add additional info
    row.push(data.userAgent);
    row.push(data.screenResolution);
    row.push(data.locale);

    // Append the row to the sheet
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'message': 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click the **Save** icon (disk icon) or press `Ctrl+S` / `Cmd+S`
5. Name your project (e.g., "Swamp Darts Analytics")

## Step 3: Deploy as Web App

1. In the Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Configure the deployment:
   - **Description**: "Swamp Darts Analytics API" (optional)
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. You may need to authorize the script:
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** → **Go to [Your Project Name] (unsafe)**
   - Click **Allow**
6. **Copy the Web App URL** - you'll need this for the next step

The URL will look like:
```
https://script.google.com/macros/s/[SCRIPT_ID]/exec
```

## Step 4: Configure Your App

1. In your Swamp Darts project, create or edit `.env.local` file
2. Add the following line:

```env
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://script.google.com/macros/s/[YOUR_SCRIPT_ID]/exec
```

Replace `[YOUR_SCRIPT_ID]` with the actual ID from the URL you copied.

## Step 5: Enable Analytics in Production

By default, analytics only runs in production. If you want to test it in development:

```env
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://script.google.com/macros/s/[YOUR_SCRIPT_ID]/exec
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

## Step 6: Deploy and Test

1. Build and deploy your app
2. Play a golf game
3. Check your Google Sheet - you should see a new row with the game data!

## Troubleshooting

### No data appearing in the sheet

1. Check that the `NEXT_PUBLIC_ANALYTICS_ENDPOINT` is set correctly
2. Open browser console and look for `[Analytics]` messages
3. Make sure you've authorized the script to run
4. Try redeploying the Apps Script (Deploy → Manage deployments → Edit → New version)

### "Authorization required" errors

1. Go back to Apps Script
2. Click **Deploy** → **Manage deployments**
3. Click the edit icon (pencil)
4. Create a new version
5. Re-authorize when prompted

## Privacy Note

This analytics system collects:
- Player names (as entered in the app)
- Device type and screen size
- Game scores and settings
- Browser information (user agent, locale)

All data is stored in your private Google Sheet. Only you have access to it.
