# Using Your Existing Google Sheet

Since you already have a Google Sheet with an Apps Script deployed, you can simply add Swamp Darts tracking to it.

## Step 1: Add a New Sheet Tab

1. Open your existing Google Sheet
2. Click the **+** button at the bottom to add a new sheet
3. Rename it to "Swamp Darts" (or whatever you prefer)
4. Add these column headers in Row 1:
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

## Step 2: Update Your Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. You should see your existing script
3. Add this new function to handle Swamp Darts data:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Check if this is Swamp Darts data (has courseName field)
    if (data.courseName) {
      return handleSwampDartsData(data);
    }

    // Otherwise, handle your existing app's data
    // ... your existing code here ...

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSwampDartsData(data) {
  // Get the Swamp Darts sheet by name
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Swamp Darts');

  // If the sheet doesn't exist, create it
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Swamp Darts');
    // Add headers
    sheet.appendRow([
      'Timestamp', 'Player Names', 'Device Type', 'Screen Type',
      'Course Name', 'Variant', 'Winner', 'Won By Tiebreaker',
      'Player 1 Name', 'Player 1 Total', 'Player 1 Holes (1-18)',
      'Player 2 Name', 'Player 2 Total', 'Player 2 Holes (1-18)',
      'Player 3 Name', 'Player 3 Total', 'Player 3 Holes (1-18)',
      'Player 4 Name', 'Player 4 Total', 'Player 4 Holes (1-18)',
      'User Agent', 'Screen Resolution', 'Locale'
    ]);
  }

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
    'message': 'Swamp Darts data saved successfully'
  })).setMimeType(ContentService.MimeType.JSON);
}
```

4. Click **Save** (disk icon)

## Step 3: Redeploy

Since you're updating existing code:

1. Click **Deploy** → **Manage deployments**
2. Click the edit icon (pencil) next to your existing deployment
3. Under "Version", select **New version**
4. Click **Deploy**
5. Copy the Web App URL (it should be the same as before)

## Step 4: Configure Swamp Darts

You can use your existing Apps Script URL:

1. In Swamp Darts project, create or edit `.env.local`:

```env
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://script.google.com/macros/s/[YOUR_EXISTING_SCRIPT_ID]/exec
```

2. Use the same URL you're already using for your other app!

## How It Works

The script now checks incoming data:
- If it has a `courseName` field → It's Swamp Darts data → Save to "Swamp Darts" sheet
- Otherwise → It's your other app's data → Save to your existing sheet

This way both apps can use the same endpoint, and data is automatically organized into different sheets.

## Alternative: Separate Script (If You Prefer)

If you'd rather keep them completely separate:

1. Create a new Google Sheet just for Swamp Darts
2. Follow the original setup instructions in `GOOGLE_SHEETS_SETUP.md`
3. You'll have two different URLs, one for each app

## Privacy Reminder

- **Users cannot see Google Sheets data** - this is only visible to you
- Users only see their local stats stored in their browser
- The Google Sheet is your private analytics dashboard
- Only you (the sheet owner) can access this data
