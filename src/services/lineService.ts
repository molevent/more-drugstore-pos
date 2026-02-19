/**
 * LINE Integration Service
 * 
 * This service provides functions for LINE integration including:
 * - Sending text messages via LINE
 * - Opening LINE app with pre-filled messages
 * - LINE Notify integration (for future server-side notifications)
 * 
 * Note: For full LINE Bot integration, you'll need:
 * 1. LINE Channel Access Token (from LINE Developers Console)
 * 2. LINE Channel Secret
 * 3. Webhook endpoint for receiving messages
 */

// LINE Share URL for opening LINE app with pre-filled text
export function openLINEWithText(text: string): void {
  const encodedText = encodeURIComponent(text);
  const lineUrl = `https://line.me/R/share?text=${encodedText}`;
  window.open(lineUrl, '_blank');
}

// LINE Official Account URL (for opening chat with business account)
export function openLINEOfficialAccount(lineId: string): void {
  const lineUrl = `https://line.me/R/ti/p/${lineId}`;
  window.open(lineUrl, '_blank');
}

// LINE Add Friend URL (with QR code)
export function openLINEAddFriend(lineId: string): void {
  const lineUrl = `https://line.me/R/nv/oa/${lineId}`;
  window.open(lineUrl, '_blank');
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num);
}

// Format currency (THB)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * LINE Notify Integration (Server-side)
 * 
 * For LINE Notify integration, you need to:
 * 1. Create a LINE Notify service at https://notify-bot.line.me/my/services/
 * 2. Get the Client ID and Client Secret
 * 3. Implement OAuth flow to get access tokens
 * 4. Use the access token to send notifications
 * 
 * Example server-side code (for Supabase Edge Functions):
 * 
 * async function sendLINENotify(message: string, accessToken: string) {
 *   const response = await fetch('https://notify-api.line.me/api/notify', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/x-www-form-urlencoded',
 *       'Authorization': `Bearer ${accessToken}`
 *     },
 *     body: new URLSearchParams({ message })
 *   });
 *   return response.json();
 * }
 */

/**
 * LINE Messaging API (Server-side)
 * 
 * For LINE Bot integration, you need to:
 * 1. Create a channel at https://developers.line.biz/
 * 2. Get Channel Access Token and Channel Secret
 * 3. Set up webhook URL in Supabase Edge Functions
 * 4. Implement message handlers
 * 
 * Example server-side code (for Supabase Edge Functions):
 * 
 * async function sendLINEMessage(userId: string, message: string, accessToken: string) {
 *   const response = await fetch('https://api.line.me/v2/bot/message/push', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'Authorization': `Bearer ${accessToken}`
 *     },
 *     body: JSON.stringify({
 *       to: userId,
 *       messages: [{ type: 'text', text: message }]
 *     })
 *   });
 *   return response.json();
 * }
 */

// Types for LINE integration
export interface LineNotifyConfig {
  accessToken: string;
}

export interface LineBotConfig {
  channelAccessToken: string;
  channelSecret: string;
}

export interface LineMessage {
  type: 'text' | 'image' | 'video' | 'audio' | 'location' | 'sticker';
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  duration?: number;
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  packageId?: string;
  stickerId?: string;
}
