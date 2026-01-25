/**
 * Analytics utility for tracking usage data
 * Sends golf game data to Google Sheets for analysis
 */

interface GolfAnalyticsData {
  timestamp: string;
  playerNames: string[];
  deviceInfo: string;
  screenType: string;
  courseName: string;
  variant: string;
  holeScores: {
    playerName: string;
    holes: (number | null)[];
    totalScore: number;
  }[];
  winner: string;
  wonByTieBreaker: boolean;
  gameDuration?: number;
  userAgent: string;
  screenResolution: string;
  locale: string;
}

/**
 * Get device type based on user agent and screen size
 */
function getDeviceInfo(): { deviceType: string; screenType: string } {
  if (typeof window === 'undefined') {
    return { deviceType: 'Unknown', screenType: 'Unknown' };
  }

  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const height = window.innerHeight;

  let deviceType = 'Desktop';
  let screenType = 'Large';

  // Detect mobile devices
  if (/Android/i.test(ua)) {
    deviceType = 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    deviceType = 'iOS';
  } else if (/Windows Phone/i.test(ua)) {
    deviceType = 'Windows Phone';
  }

  // Determine screen type
  if (width < 768) {
    screenType = 'Mobile';
  } else if (width < 1024) {
    screenType = 'Tablet';
  } else {
    screenType = 'Desktop';
  }

  // Check orientation for mobile
  if (deviceType !== 'Desktop' && width > height) {
    screenType += ' (Landscape)';
  } else if (deviceType !== 'Desktop') {
    screenType += ' (Portrait)';
  }

  return { deviceType, screenType };
}

/**
 * Send golf game analytics to Google Sheets
 */
export async function trackGolfGame(data: {
  playerNames: string[];
  courseName: string;
  variant: string;
  holeScores: {
    playerName: string;
    holes: (number | null)[];
    totalScore: number;
  }[];
  winner: string;
  wonByTieBreaker: boolean;
  gameDuration?: number;
}): Promise<void> {
  // Only track in production or if explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
    console.log('[Analytics] Skipping in development mode');
    return;
  }

  // Check if Google Sheets endpoint is configured
  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  if (!endpoint) {
    console.log('[Analytics] No endpoint configured');
    return;
  }

  try {
    const { deviceType, screenType } = getDeviceInfo();

    const analyticsData: GolfAnalyticsData = {
      timestamp: new Date().toISOString(),
      playerNames: data.playerNames,
      deviceInfo: deviceType,
      screenType: screenType,
      courseName: data.courseName,
      variant: data.variant,
      holeScores: data.holeScores,
      winner: data.winner,
      wonByTieBreaker: data.wonByTieBreaker,
      gameDuration: data.gameDuration,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      locale: navigator.language,
    };

    // Send to Google Sheets endpoint (non-blocking)
    fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script requires no-cors
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyticsData),
    }).catch(error => {
      // Silently fail - don't block user experience
      console.error('[Analytics] Failed to send data:', error);
    });

    console.log('[Analytics] Golf game tracked');
  } catch (error) {
    console.error('[Analytics] Error preparing analytics data:', error);
  }
}
