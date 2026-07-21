import { createElement } from "react";
import {
  AmazonLogoIcon,
  AppleLogoIcon,
  BookmarkSimpleIcon,
  BriefcaseIcon,
  CalendarBlankIcon,
  CameraIcon,
  ChartBarIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudIcon,
  CodeIcon,
  CompassIcon,
  DesktopIcon,
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  FacebookLogoIcon,
  FileIcon,
  FolderIcon,
  FolderSimpleIcon,
  GameControllerIcon,
  GearIcon,
  GithubLogoIcon,
  GlobeSimpleIcon,
  GoogleLogoIcon,
  GraduationCapIcon,
  HeartIcon,
  HouseIcon,
  HouseSimpleIcon,
  ImageIcon,
  InstagramLogoIcon,
  KeyIcon,
  LightbulbIcon,
  LinkSimpleIcon,
  LinkedinLogoIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MediumLogoIcon,
  MoonIcon,
  MusicNoteIcon,
  NewspaperIcon,
  NoteIcon,
  PackageIcon,
  PaletteIcon,
  PaperPlaneIcon,
  PhoneIcon,
  PinterestLogoIcon,
  PlayIcon,
  RedditLogoIcon,
  RocketIcon,
  SlackLogoIcon,
  SparkleIcon,
  SpotifyLogoIcon,
  StarIcon,
  SteamLogoIcon,
  StorefrontIcon,
  SunIcon,
  TelegramLogoIcon,
  ThreadsLogoIcon,
  TiktokLogoIcon,
  TrashIcon,
  TwitchLogoIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
  WhatsappLogoIcon,
  WrenchIcon,
  XLogoIcon,
  YoutubeLogoIcon,
  type Icon,
  type IconProps,
} from "@phosphor-icons/react";

const legacyIconNames: Record<string, string> = {
  bookmark: "BookmarkSimpleIcon",
  briefcase: "BriefcaseIcon",
  github: "GithubLogoIcon",
  globe: "GlobeSimpleIcon",
  home: "HouseIcon",
  link: "LinkSimpleIcon",
  mail: "EnvelopeSimpleIcon",
  star: "StarIcon",
  youtube: "YoutubeLogoIcon",
};

const iconRegistry = {
  AmazonLogoIcon,
  AppleLogoIcon,
  BookmarkSimpleIcon,
  BriefcaseIcon,
  CalendarBlankIcon,
  CameraIcon,
  ChartBarIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudIcon,
  CodeIcon,
  CompassIcon,
  DesktopIcon,
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  FacebookLogoIcon,
  FileIcon,
  FolderIcon,
  FolderSimpleIcon,
  GameControllerIcon,
  GearIcon,
  GithubLogoIcon,
  GlobeSimpleIcon,
  GoogleLogoIcon,
  GraduationCapIcon,
  HeartIcon,
  HouseIcon,
  HouseSimpleIcon,
  ImageIcon,
  InstagramLogoIcon,
  KeyIcon,
  LightbulbIcon,
  LinkSimpleIcon,
  LinkedinLogoIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MediumLogoIcon,
  MoonIcon,
  MusicNoteIcon,
  NewspaperIcon,
  NoteIcon,
  PackageIcon,
  PaletteIcon,
  PaperPlaneIcon,
  PhoneIcon,
  PinterestLogoIcon,
  PlayIcon,
  RedditLogoIcon,
  RocketIcon,
  SlackLogoIcon,
  SparkleIcon,
  SpotifyLogoIcon,
  StarIcon,
  SteamLogoIcon,
  StorefrontIcon,
  SunIcon,
  TelegramLogoIcon,
  ThreadsLogoIcon,
  TiktokLogoIcon,
  TrashIcon,
  TwitchLogoIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
  WhatsappLogoIcon,
  WrenchIcon,
  XLogoIcon,
  YoutubeLogoIcon,
} satisfies Record<string, Icon>;

function formatIconLabel(name: string) {
  return name
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/Logo$/, " Logo")
    .trim();
}

export function normalizePhosphorIconName(name?: string) {
  if (!name) {
    return "LinkSimpleIcon";
  }

  const normalizedName = legacyIconNames[name] ?? name;

  return normalizedName.endsWith("Icon")
    ? normalizedName
    : `${normalizedName}Icon`;
}

export const phosphorIconOptions = Object.keys(iconRegistry)
  .map((value) => ({
    value,
    label: formatIconLabel(value),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function getPhosphorIcon(name?: string): Icon {
  const normalizedName = normalizePhosphorIconName(name);

  return iconRegistry[normalizedName as keyof typeof iconRegistry] ?? LinkSimpleIcon;
}

export function PhosphorIcon({
  name,
  ...props
}: IconProps & { name?: string }) {
  return createElement(getPhosphorIcon(name), props);
}
