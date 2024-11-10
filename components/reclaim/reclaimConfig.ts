// reclaimConfig.ts

export const RECLAIM_CONFIG = {
  APP_ID: process.env.NEXT_PUBLIC_RECLAIM_APP_ID,
  APP_SECRET: process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET,
  REDIRECT_URL: 'https://app.useark.xyz/chat',
  PROVIDERS: [
    { 
      id: process.env.NEXT_PUBLIC_TWITTER_FOLLOWER_COUNT_ID, 
      name: "Twitter Follower Count" 
    },
    { 
      id: process.env.NEXT_PUBLIC_STEAM_ID, 
      name: "Steam ID" 
    },
    { 
      id: process.env.NEXT_PUBLIC_DUBAI_LAND_METADATA_ID, 
      name: "Dubai Land Department" 
    },
    { 
      id: process.env.NEXT_PUBLIC_DUBAI_LAND_EMIRATES_ID, 
      name: "Dubai Land Department - Emirates Id" 
    },
    { id: process.env.NEXT_PUBLIC_LINKEDIN_POST_IMPRESSIONS_ID, name: "Linkedin Provider for Post Impressions" },
    { id: process.env.NEXT_PUBLIC_DUBAI_LAND_TENANT_V2_ID, name: "Dubai Land Department - Tenant Verification V2" },
    { id: process.env.NEXT_PUBLIC_BOA_ACCOUNT_BALANCE_ID, name: "Bank of America Account Balance" },
    { id: process.env.NEXT_PUBLIC_LINKEDIN_DASHBOARD_ANALYTICS_ID, name: "LinkedIn Dashboard Analytics" },
    { id: process.env.NEXT_PUBLIC_YOUTUBE_CREATOR_ANALYTICS_ID, name: "Youtube Creator Analytics in Last 28 days" },
    { id: process.env.NEXT_PUBLIC_LINKEDIN_ANALYTICS_DATA_ID, name: "LinkedIn Analytics Data" },
    { id: process.env.NEXT_PUBLIC_USA_IDENTITY_ID, name: "USA Identity" },
    { id: process.env.NEXT_PUBLIC_INSTAGRAM_STORY_VIEWS_ID, name: "Instagram Story Views" },
    { id: process.env.NEXT_PUBLIC_KAGGLE_USERNAME_ID, name: "Kaggle username working" },
    { id: process.env.NEXT_PUBLIC_COINBASE_KYC_ID, name: "Coinbase Completed KYC" },
    { id: process.env.NEXT_PUBLIC_TWITTER_CREDENTIALS_ID, name: "Twitter Credentials" },
    { id: process.env.NEXT_PUBLIC_SPOTIFY_PUBLIC_PLAYLIST_ID, name: "Spotify Proof of Public Playlist" },
    { id: process.env.NEXT_PUBLIC_FACEBOOK_ID, name: "Facebook" },
    { id: process.env.NEXT_PUBLIC_AIRBNB_HOST_ID, name: "AirbnbHost" },
    { id: process.env.NEXT_PUBLIC_SOUTH_AFRICA_ID, name: "SOUTH AFRICA ID" },
    { id: process.env.NEXT_PUBLIC_UZ_TAX_PAID_ID, name: "UZ Tax paid" },
    { id: process.env.NEXT_PUBLIC_BINANCE_KYC_LEVEL_ID, name: "Binance KYC Level" },
    { id: process.env.NEXT_PUBLIC_AMAZON_PRIME_MEMBERSHIP_ID, name: "Amazon Prime Membership" },
    { id: process.env.NEXT_PUBLIC_US_SSN_NAME_EXTRACTOR_ID, name: "US SSN Name Extractor" },
    { id: process.env.NEXT_PUBLIC_DSID_TWITTER_USERNAME_ID, name: "DSID Twitter Username" },
    { id: process.env.NEXT_PUBLIC_DISCORD_CHANNEL_ACCESS_ID, name: "Discord Channel Access" },
    { id: process.env.NEXT_PUBLIC_INDIA_IDENTITY_ID, name: "India Identity" },
    { id: process.env.NEXT_PUBLIC_BINANCE_TX_HISTORY_ID, name: "Binance Tx History" },
    { id: process.env.NEXT_PUBLIC_NEXUSPAY_BOLT_DROPOFF_ID, name: "Nexuspay Bolt Dropoff Location" },
    { id: process.env.NEXT_PUBLIC_TWEET_VERIFIER_ID, name: "Tweet Verifier" },
    { id: process.env.NEXT_PUBLIC_UK_NHS_NUMBER_ID, name: "UK NHS Number" },
    { id: process.env.NEXT_PUBLIC_CANADA_IDENTITY_ID, name: "Canada Identity" },
    { id: process.env.NEXT_PUBLIC_RUSSIA_IDENTITY_ID, name: "Russia Identity" },
    { id: process.env.NEXT_PUBLIC_DISCORD_CHANNEL_ID, name: "Discord Channel ID" },
    { id: process.env.NEXT_PUBLIC_UZBEKISTAN_IDENTITY_ID, name: "Uzbekistan Identity" },
    { id: process.env.NEXT_PUBLIC_PORTUGAL_IDENTITY_ID, name: "Portugal Identity" },
    { id: process.env.NEXT_PUBLIC_NETHERLANDS_IDENTITY_ID, name: "Netherlands Identity" },
    { id: process.env.NEXT_PUBLIC_GITHUB_REPOSITORIES_ID, name: "Total GitHub Repositories" },
    { id: process.env.NEXT_PUBLIC_DISCORD_USER_ID, name: "Discord User Id" },
    { id: process.env.NEXT_PUBLIC_GERMANY_IDENTITY_ID, name: "Germany Identity" },
    { id: process.env.NEXT_PUBLIC_STRIPE_TRANSACTION_ID, name: "Last Stripe Transaction Amount" },
    { id: process.env.NEXT_PUBLIC_LEETCODE_ID, name: "Leetcode" },
    { id: process.env.NEXT_PUBLIC_AMAZON_ORDERS_ID, name: "Amazon Orders A" },
    { id: process.env.NEXT_PUBLIC_AMAZON_EMAIL_PHONE_ID, name: "Amazon Email & Phone no." },
    { id: process.env.NEXT_PUBLIC_GITHUB_USERNAME, name: "GitHub UserName" },
    { id: process.env.NEXT_PUBLIC_UBER_UID, name: "Uber UID" },
    { id: process.env.NEXT_PUBLIC_GMAIL_ACCOUNT, name: "Gmail Account" },
    { id: process.env.NEXT_PUBLIC_TOTAL_WON_EARN_SUPERTEAM, name: "Total Earned on Superteam Earn" },
    { id: process.env.NEXT_PUBLIC_HACKERRANK_USERNAME, name: "Hackerrank Username" },
    { id: process.env.NEXT_PUBLIC_TITLE_SUPERTEAM, name: "Title Superteam" },
    { id: process.env.NEXT_PUBLIC_GITHUB_CONTRIBUTIONS_LAST_YEAR, name: "Github Contributions in the last year" },
    { id: process.env.NEXT_PUBLIC_RAZORPAY_SALARY, name: "RazorPay Salary" },
    { id: process.env.NEXT_PUBLIC_YC_FOUNDER_DETAILS, name: "YC Founder Details" },
    { id: process.env.NEXT_PUBLIC_CHINA_IDENTITY, name: "China Identity" },
    { id: process.env.NEXT_PUBLIC_IG_STORY_LIKEMONEY_KOUSHITH, name: "IG Story - LikeMoney - Koushith" },
    { id: process.env.NEXT_PUBLIC_LINKEDIN_RECENT_EMPLOYMENT, name: "Linkedin - Recent Employment" },
    { id: process.env.NEXT_PUBLIC_PREMIER_DATA, name: "Premier Data" },
    { id: process.env.NEXT_PUBLIC_PREMIER_LEAGUE_SOLANA_FPL, name: "Premier League Solana FPL" },
    { id: process.env.NEXT_PUBLIC_NIGERIA_IDENTITY, name: "Nigeria Identity" },
    { id: process.env.NEXT_PUBLIC_FRANCE_IDENTITY, name: "France Identity" },
    { id: process.env.NEXT_PUBLIC_EGYPT_IDENTITY, name: "Egypt Identity" },
    { id: process.env.NEXT_PUBLIC_UKRAINE_IDENTITY, name: "Ukraine Identity" },
    { id: process.env.NEXT_PUBLIC_HACKERRANK_VERIFY_BADGES, name: "Hackerank - Verify badges" },
    { id: process.env.NEXT_PUBLIC_DUOLINGO_ACHIEVEMENTS_KOUSHITH, name: "Duolingo Achievements - Koushith - Eth-SG" },
    { id: process.env.NEXT_PUBLIC_TWITTER_FOLLOW_CHECK, name: "Twitter Follow Check" },  
    // ... add other providers as needed
  ].filter(provider => provider.id) // Only include providers with defined IDs
} as const;

// Type definitions
export interface ReclaimProvider {
  id: string | undefined;
  name: string;
}

export interface ReclaimConfig {
  APP_ID: string | undefined;
  APP_SECRET: string | undefined;
  REDIRECT_URL: string;
  PROVIDERS: ReclaimProvider[];
}

export default RECLAIM_CONFIG;