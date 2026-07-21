export type PopularSite = {
  color: string;
  icon: string;
  id: string;
  initials: string;
  name: string;
  url: string;
};

export const brandIconPrefix = "brand:";

export const popularSites = [
  {
    color: "#ff9900",
    icon: "AmazonLogoIcon",
    id: "amazon",
    initials: "a",
    name: "Amazon",
    url: "https://www.amazon.com",
  },
  {
    color: "#ff0000",
    icon: "YoutubeLogoIcon",
    id: "youtube",
    initials: "YT",
    name: "YouTube",
    url: "https://www.youtube.com",
  },
  {
    color: "#4285f4",
    icon: "GoogleLogoIcon",
    id: "google",
    initials: "G",
    name: "Google",
    url: "https://www.google.com",
  },
  {
    color: "#181717",
    icon: "GithubLogoIcon",
    id: "github",
    initials: "GH",
    name: "GitHub",
    url: "https://github.com",
  },
  {
    color: "#e4405f",
    icon: "InstagramLogoIcon",
    id: "instagram",
    initials: "IG",
    name: "Instagram",
    url: "https://www.instagram.com",
  },
  {
    color: "#1877f2",
    icon: "FacebookLogoIcon",
    id: "facebook",
    initials: "f",
    name: "Facebook",
    url: "https://www.facebook.com",
  },
  {
    color: "#000000",
    icon: "XLogoIcon",
    id: "x",
    initials: "X",
    name: "X",
    url: "https://x.com",
  },
  {
    color: "#0a66c2",
    icon: "LinkedinLogoIcon",
    id: "linkedin",
    initials: "in",
    name: "LinkedIn",
    url: "https://www.linkedin.com",
  },
  {
    color: "#1db954",
    icon: "SpotifyLogoIcon",
    id: "spotify",
    initials: "S",
    name: "Spotify",
    url: "https://open.spotify.com",
  },
  {
    color: "#9146ff",
    icon: "TwitchLogoIcon",
    id: "twitch",
    initials: "Tw",
    name: "Twitch",
    url: "https://www.twitch.tv",
  },
  {
    color: "#5865f2",
    icon: "DiscordLogoIcon",
    id: "discord",
    initials: "D",
    name: "Discord",
    url: "https://discord.com",
  },
  {
    color: "#ff4500",
    icon: "RedditLogoIcon",
    id: "reddit",
    initials: "R",
    name: "Reddit",
    url: "https://www.reddit.com",
  },
  {
    color: "#000000",
    icon: "TiktokLogoIcon",
    id: "tiktok",
    initials: "T",
    name: "TikTok",
    url: "https://www.tiktok.com",
  },
  {
    color: "#000000",
    icon: "AppleLogoIcon",
    id: "apple",
    initials: "A",
    name: "Apple",
    url: "https://www.apple.com",
  },
  {
    color: "#25d366",
    icon: "WhatsappLogoIcon",
    id: "whatsapp",
    initials: "WA",
    name: "WhatsApp",
    url: "https://web.whatsapp.com",
  },
  {
    color: "#229ed9",
    icon: "TelegramLogoIcon",
    id: "telegram",
    initials: "TG",
    name: "Telegram",
    url: "https://web.telegram.org",
  },
  {
    color: "#e60023",
    icon: "PinterestLogoIcon",
    id: "pinterest",
    initials: "P",
    name: "Pinterest",
    url: "https://www.pinterest.com",
  },
  {
    color: "#171a21",
    icon: "SteamLogoIcon",
    id: "steam",
    initials: "ST",
    name: "Steam",
    url: "https://store.steampowered.com",
  },
  {
    color: "#000000",
    icon: "MediumLogoIcon",
    id: "medium",
    initials: "M",
    name: "Medium",
    url: "https://medium.com",
  },
  {
    color: "#000000",
    icon: "ThreadsLogoIcon",
    id: "threads",
    initials: "Th",
    name: "Threads",
    url: "https://www.threads.net",
  },
  {
    color: "#4a154b",
    icon: "SlackLogoIcon",
    id: "slack",
    initials: "S",
    name: "Slack",
    url: "https://app.slack.com",
  },
  {
    color: "#0061ff",
    icon: "DropboxLogoIcon",
    id: "dropbox",
    initials: "DB",
    name: "Dropbox",
    url: "https://www.dropbox.com",
  },
] satisfies PopularSite[];

export function getBrandIconId(siteId: string) {
  return `${brandIconPrefix}${siteId}`;
}

export function getPopularSiteByIcon(iconName?: string) {
  if (!iconName?.startsWith(brandIconPrefix)) {
    return undefined;
  }

  const siteId = iconName.slice(brandIconPrefix.length);

  return popularSites.find((site) => site.id === siteId);
}

export function getPopularSiteByUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    return popularSites.find((site) => {
      const siteHostname = new URL(site.url).hostname.replace(/^www\./, "");
      return hostname === siteHostname || hostname.endsWith(`.${siteHostname}`);
    });
  } catch {
    return undefined;
  }
}
