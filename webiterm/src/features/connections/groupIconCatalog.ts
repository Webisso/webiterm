export type GroupIconDef = { id: string; label: string; paths: string[] };

export const GROUP_ICONS: GroupIconDef[] = [
  {
    "id": "folder",
    "label": "Folder",
    "paths": ["M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"]
  },
  {
    "id": "folder-open",
    "label": "Folder open",
    "paths": ["M6 14.5V4a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.95 1.7A2 2 0 0 0 14.1 6H18a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"]
  },
  {
    "id": "folder-tree",
    "label": "Folder tree",
    "paths": ["M6 11h12M6 15h12M6 7h12M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"]
  },
  {
    "id": "archive",
    "label": "Archive",
    "paths": ["M12 3c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4zm0 7c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4z"]
  },
  {
    "id": "box",
    "label": "Box",
    "paths": ["M17.5 19H9a7 7 0 1 1 6.71-9.5h.79a5.5 5.5 0 1 1 0 11Z"]
  },
  {
    "id": "package",
    "label": "Package",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"]
  },
  {
    "id": "layers",
    "label": "Layers",
    "paths": ["M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z"]
  },
  {
    "id": "files",
    "label": "Files",
    "paths": ["M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"]
  },
  {
    "id": "file",
    "label": "File",
    "paths": ["M4 17l6-6-6-6M12 19h8"]
  },
  {
    "id": "file-code",
    "label": "File code",
    "paths": ["M16 18l6-6-6-6M8 6l-6 6 6 6"]
  },
  {
    "id": "server",
    "label": "Server",
    "paths": ["M9 2v2M15 2v2M9 20v2M15 20v2M4 9H2M4 15H2M22 9h-2M22 15h-2M8 6h8v12H8z"]
  },
  {
    "id": "database",
    "label": "Database",
    "paths": ["M22 12H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11zM6 16h.01M10 16h.01"]
  },
  {
    "id": "hard-drive",
    "label": "Hard drive",
    "paths": ["M12 22v-5M9 8V2M15 8V2M6 12H2M22 12h-4M5 19l-2 3M19 19l2 3"]
  },
  {
    "id": "cpu",
    "label": "CPU",
    "paths": ["M12 20h.01M8.5 16.429a5 5 0 0 1 7 0M5 12.859a10 10 0 0 1 14 0M2 8.82a15 15 0 0 1 22 0"]
  },
  {
    "id": "memory",
    "label": "Memory",
    "paths": ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"]
  },
  {
    "id": "container",
    "label": "Container",
    "paths": ["M21 8v13H3V8M1 6h22v2H1zM10 12h4"]
  },
  {
    "id": "cloud",
    "label": "Cloud",
    "paths": ["M3 3h18v4H3zM5 7v14h14V7M10 12h4"]
  },
  {
    "id": "globe",
    "label": "Globe",
    "paths": ["M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5"]
  },
  {
    "id": "network",
    "label": "Network",
    "paths": ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"]
  },
  {
    "id": "wifi",
    "label": "Wi‑Fi",
    "paths": ["M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z"]
  },
  {
    "id": "terminal",
    "label": "Terminal",
    "paths": ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12H4M10 12H8M14 12h-2M18 12h-2M10 16H8M14 16h-2M6 20h12"]
  },
  {
    "id": "code",
    "label": "Code",
    "paths": ["M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M2 8h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"]
  },
  {
    "id": "git",
    "label": "Git",
    "paths": ["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"]
  },
  {
    "id": "bug",
    "label": "Bug",
    "paths": ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"]
  },
  {
    "id": "bot",
    "label": "Bot",
    "paths": ["M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"]
  },
  {
    "id": "sparkles",
    "label": "Sparkles",
    "paths": ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7 7-7z"]
  },
  {
    "id": "api",
    "label": "API",
    "paths": ["M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.59-7.59a1 1 0 0 0 0-1.41L12 2zM7 7h.01"]
  },
  {
    "id": "webhook",
    "label": "Webhook",
    "paths": ["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"]
  },
  {
    "id": "brackets",
    "label": "Brackets",
    "paths": ["M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16"]
  },
  {
    "id": "workflow",
    "label": "Workflow",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"]
  },
  {
    "id": "lock",
    "label": "Lock",
    "paths": ["M4 22V4a1 1 0 0 1 1-1h14l-3 4 3 4H5"]
  },
  {
    "id": "key",
    "label": "Key",
    "paths": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"]
  },
  {
    "id": "shield",
    "label": "Shield",
    "paths": ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 0 1 0-8 4 4 0 0 1 0 8z"]
  },
  {
    "id": "fingerprint",
    "label": "Fingerprint",
    "paths": ["M4 4h16v16H4zM22 6l-10 7L2 6"]
  },
  {
    "id": "eye",
    "label": "Eye",
    "paths": ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"]
  },
  {
    "id": "user",
    "label": "User",
    "paths": ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"]
  },
  {
    "id": "users",
    "label": "Users",
    "paths": ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]
  },
  {
    "id": "building",
    "label": "Building",
    "paths": ["M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5 11 17l3.5-4.5 4.5 6H5l3.5-5.5z"]
  },
  {
    "id": "briefcase",
    "label": "Work",
    "paths": ["M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"]
  },
  {
    "id": "home",
    "label": "Home",
    "paths": ["M9 18V5l12-2v13M9 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]
  },
  {
    "id": "mail",
    "label": "Mail",
    "paths": ["M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3"]
  },
  {
    "id": "message",
    "label": "Message",
    "paths": ["M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]
  },
  {
    "id": "phone",
    "label": "Phone",
    "paths": ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"]
  },
  {
    "id": "send",
    "label": "Send",
    "paths": ["M12 22v-5M9 8V2M15 8V2M7 12H5a2 2 0 0 0-2 2v2a8 8 0 0 0 16 0v-2a2 2 0 0 0-2-2h-2"]
  },
  {
    "id": "inbox",
    "label": "Inbox",
    "paths": ["M22 14v-4M6 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2M6 10h12v4H6z"]
  },
  {
    "id": "share",
    "label": "Share",
    "paths": ["M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]
  },
  {
    "id": "link",
    "label": "Link",
    "paths": ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"]
  },
  {
    "id": "rss",
    "label": "RSS",
    "paths": ["M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"]
  },
  {
    "id": "radio",
    "label": "Radio",
    "paths": ["M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"]
  },
  {
    "id": "satellite",
    "label": "Satellite",
    "paths": ["M12 22v-7M6 12 12 2l6 10M4 14h16"]
  },
  {
    "id": "chart",
    "label": "Chart",
    "paths": ["M8 3l4 8 5-5 5 15H2L8 3z"]
  },
  {
    "id": "activity",
    "label": "Activity",
    "paths": ["M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M4 18l-1-5h18l-1 5M5 10l4-6 4 4 4-6 3 8"]
  },
  {
    "id": "target",
    "label": "Target",
    "paths": ["M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H10.3a2 2 0 0 0-1.6.9L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17h10M7 14h.01M17 14h.01"]
  },
  {
    "id": "compass",
    "label": "Compass",
    "paths": ["M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"]
  },
  {
    "id": "map",
    "label": "Map",
    "paths": ["M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7l8.7 5 8.7-5M12 22V12"]
  },
  {
    "id": "flag",
    "label": "Flag",
    "paths": ["M6 6h15l-1.5 9h-12zM6 6l-2-3M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"]
  },
  {
    "id": "pin",
    "label": "Pin",
    "paths": ["M3 3v18h18M7 16l4-8 4 4 6-10"]
  },
  {
    "id": "anchor",
    "label": "Anchor",
    "paths": ["M22 12h-4l-3 9L9 3l-3 9H2"]
  },
  {
    "id": "calendar",
    "label": "Calendar",
    "paths": ["M8 2v4M16 2v4M12 22v-4M4 14h16M6 18h12M4 10h16M6 6h12"]
  },
  {
    "id": "clock",
    "label": "Clock",
    "paths": ["M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4L8.12 15.88"]
  },
  {
    "id": "zap",
    "label": "Zap",
    "paths": ["M22 7.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.5M2 7.5h20M6 3h12v4.5H6z"]
  },
  {
    "id": "rocket",
    "label": "Rocket",
    "paths": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"]
  },
  {
    "id": "star",
    "label": "Star",
    "paths": ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v4a2 2 0 0 0 2 2h4M10 12h8M10 16h8M10 8h2"]
  },
  {
    "id": "heart",
    "label": "Heart",
    "paths": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 13l-2 2 2 2M14 13l2 2-2 2"]
  },
  {
    "id": "tag",
    "label": "Tag",
    "paths": ["M12 8V4H8M2 14h2M20 14h2M15 13v2M9 13v2M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"]
  },
  {
    "id": "bookmark",
    "label": "Bookmark",
    "paths": ["M9.94 15.56 8 22l-1.94-6.44L0 13.5l6.06-2.06L8 5l1.94 6.44L16 13.5l-6.06 2.06zM19 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"]
  },
  {
    "id": "sun",
    "label": "Sun",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"]
  },
  {
    "id": "moon",
    "label": "Moon",
    "paths": ["M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"]
  },
  {
    "id": "droplet",
    "label": "Droplet",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2"]
  },
  {
    "id": "leaf",
    "label": "Leaf",
    "paths": ["M22 12h-6l-2 3H10l-2-3H2M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"]
  },
  {
    "id": "tree",
    "label": "Tree",
    "paths": ["M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"]
  },
  {
    "id": "mountain",
    "label": "Mountain",
    "paths": ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"]
  },
  {
    "id": "ship",
    "label": "Ship",
    "paths": ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"]
  },
  {
    "id": "car",
    "label": "Car",
    "paths": ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"]
  },
  {
    "id": "plane",
    "label": "Plane",
    "paths": ["M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"]
  },
  {
    "id": "cart",
    "label": "Cart",
    "paths": ["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"]
  },
  {
    "id": "wallet",
    "label": "Wallet",
    "paths": ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35"]
  },
  {
    "id": "credit",
    "label": "Credit card",
    "paths": ["M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z"]
  },
  {
    "id": "shop",
    "label": "Shop",
    "paths": ["M12 22V8M5 12H2a10 10 0 0 0 20 0h-3M12 2v2"]
  },
  {
    "id": "gift",
    "label": "Gift",
    "paths": ["M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"]
  },
  {
    "id": "camera",
    "label": "Camera",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 14h.01M12 14h.01M16 14h.01M12 18h.01"]
  },
  {
    "id": "image",
    "label": "Image",
    "paths": ["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z"]
  },
  {
    "id": "film",
    "label": "Film",
    "paths": ["M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"]
  },
  {
    "id": "music",
    "label": "Music",
    "paths": ["M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"]
  },
  {
    "id": "mic",
    "label": "Mic",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01"]
  },
  {
    "id": "palette",
    "label": "Palette",
    "paths": ["M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"]
  },
  {
    "id": "pen",
    "label": "Pen",
    "paths": ["M12 5v14M5 12h14"]
  },
  {
    "id": "brush",
    "label": "Brush",
    "paths": ["M20 6 9 17l-5-5"]
  },
  {
    "id": "scissors",
    "label": "Scissors",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"]
  },
  {
    "id": "crop",
    "label": "Crop",
    "paths": ["M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"]
  },
  {
    "id": "settings",
    "label": "Settings",
    "paths": ["M6 14.5V4a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.95 1.7A2 2 0 0 0 14.1 6H18a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"]
  },
  {
    "id": "wrench",
    "label": "Wrench",
    "paths": ["M6 11h12M6 15h12M6 7h12M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"]
  },
  {
    "id": "plug",
    "label": "Plug",
    "paths": ["M12 3c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4zm0 7c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4z"]
  },
  {
    "id": "battery",
    "label": "Battery",
    "paths": ["M17.5 19H9a7 7 0 1 1 6.71-9.5h.79a5.5 5.5 0 1 1 0 11Z"]
  },
  {
    "id": "download",
    "label": "Download",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"]
  },
  {
    "id": "upload",
    "label": "Upload",
    "paths": ["M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z"]
  },
  {
    "id": "filter",
    "label": "Filter",
    "paths": ["M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"]
  },
  {
    "id": "search",
    "label": "Search",
    "paths": ["M4 17l6-6-6-6M12 19h8"]
  },
  {
    "id": "refresh",
    "label": "Refresh",
    "paths": ["M16 18l6-6-6-6M8 6l-6 6 6 6"]
  },
  {
    "id": "repeat",
    "label": "Repeat",
    "paths": ["M9 2v2M15 2v2M9 20v2M15 20v2M4 9H2M4 15H2M22 9h-2M22 15h-2M8 6h8v12H8z"]
  },
  {
    "id": "clipboard",
    "label": "Clipboard",
    "paths": ["M22 12H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11zM6 16h.01M10 16h.01"]
  },
  {
    "id": "copy",
    "label": "Copy",
    "paths": ["M12 22v-5M9 8V2M15 8V2M6 12H2M22 12h-4M5 19l-2 3M19 19l2 3"]
  },
  {
    "id": "trash",
    "label": "Trash",
    "paths": ["M12 20h.01M8.5 16.429a5 5 0 0 1 7 0M5 12.859a10 10 0 0 1 14 0M2 8.82a15 15 0 0 1 22 0"]
  },
  {
    "id": "alert",
    "label": "Alert",
    "paths": ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"]
  },
  {
    "id": "info",
    "label": "Info",
    "paths": ["M21 8v13H3V8M1 6h22v2H1zM10 12h4"]
  },
  {
    "id": "help",
    "label": "Help",
    "paths": ["M3 3h18v4H3zM5 7v14h14V7M10 12h4"]
  },
  {
    "id": "plus",
    "label": "Plus",
    "paths": ["M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5"]
  },
  {
    "id": "check",
    "label": "Check",
    "paths": ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"]
  },
  {
    "id": "minus",
    "label": "Minus",
    "paths": ["M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z"]
  },
  {
    "id": "x",
    "label": "Close",
    "paths": ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12H4M10 12H8M14 12h-2M18 12h-2M10 16H8M14 16h-2M6 20h12"]
  },
  {
    "id": "prod",
    "label": "Production",
    "paths": ["M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M2 8h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"]
  },
  {
    "id": "staging",
    "label": "Staging",
    "paths": ["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"]
  },
  {
    "id": "dev",
    "label": "Development",
    "paths": ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"]
  },
  {
    "id": "test",
    "label": "Testing",
    "paths": ["M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"]
  },
  {
    "id": "local",
    "label": "Local",
    "paths": ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7 7-7z"]
  },
  {
    "id": "vpn",
    "label": "VPN",
    "paths": ["M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.59-7.59a1 1 0 0 0 0-1.41L12 2zM7 7h.01"]
  },
  {
    "id": "dmz",
    "label": "DMZ",
    "paths": ["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"]
  },
  {
    "id": "internal",
    "label": "Internal",
    "paths": ["M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16"]
  },
  {
    "id": "external",
    "label": "External",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"]
  },
  {
    "id": "backup",
    "label": "Backup",
    "paths": ["M4 22V4a1 1 0 0 1 1-1h14l-3 4 3 4H5"]
  },
  {
    "id": "monitor",
    "label": "Monitor",
    "paths": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"]
  },
  {
    "id": "laptop",
    "label": "Laptop",
    "paths": ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 0 1 0-8 4 4 0 0 1 0 8z"]
  },
  {
    "id": "mobile",
    "label": "Mobile",
    "paths": ["M4 4h16v16H4zM22 6l-10 7L2 6"]
  },
  {
    "id": "tablet",
    "label": "Tablet",
    "paths": ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"]
  },
  {
    "id": "printer",
    "label": "Printer",
    "paths": ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"]
  },
  {
    "id": "router",
    "label": "Router",
    "paths": ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]
  },
  {
    "id": "switch",
    "label": "Switch",
    "paths": ["M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5 11 17l3.5-4.5 4.5 6H5l3.5-5.5z"]
  },
  {
    "id": "firewall",
    "label": "Firewall",
    "paths": ["M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"]
  },
  {
    "id": "dns",
    "label": "DNS",
    "paths": ["M9 18V5l12-2v13M9 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]
  },
  {
    "id": "cdn",
    "label": "CDN",
    "paths": ["M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3"]
  },
  {
    "id": "redis",
    "label": "Redis",
    "paths": ["M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]
  },
  {
    "id": "mysql",
    "label": "MySQL",
    "paths": ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"]
  },
  {
    "id": "postgres",
    "label": "PostgreSQL",
    "paths": ["M12 22v-5M9 8V2M15 8V2M7 12H5a2 2 0 0 0-2 2v2a8 8 0 0 0 16 0v-2a2 2 0 0 0-2-2h-2"]
  },
  {
    "id": "mongo",
    "label": "MongoDB",
    "paths": ["M22 14v-4M6 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2M6 10h12v4H6z"]
  },
  {
    "id": "elastic",
    "label": "Elastic",
    "paths": ["M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]
  },
  {
    "id": "kafka",
    "label": "Kafka",
    "paths": ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"]
  },
  {
    "id": "docker",
    "label": "Docker",
    "paths": ["M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"]
  },
  {
    "id": "k8s",
    "label": "Kubernetes",
    "paths": ["M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"]
  },
  {
    "id": "aws",
    "label": "AWS",
    "paths": ["M12 22v-7M6 12 12 2l6 10M4 14h16"]
  },
  {
    "id": "azure",
    "label": "Azure",
    "paths": ["M8 3l4 8 5-5 5 15H2L8 3z"]
  },
  {
    "id": "gcp",
    "label": "GCP",
    "paths": ["M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M4 18l-1-5h18l-1 5M5 10l4-6 4 4 4-6 3 8"]
  },
  {
    "id": "linux",
    "label": "Linux",
    "paths": ["M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H10.3a2 2 0 0 0-1.6.9L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17h10M7 14h.01M17 14h.01"]
  },
  {
    "id": "ubuntu",
    "label": "Ubuntu",
    "paths": ["M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"]
  },
  {
    "id": "debian",
    "label": "Debian",
    "paths": ["M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7l8.7 5 8.7-5M12 22V12"]
  },
  {
    "id": "centos",
    "label": "CentOS",
    "paths": ["M6 6h15l-1.5 9h-12zM6 6l-2-3M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"]
  },
  {
    "id": "windows",
    "label": "Windows",
    "paths": ["M3 3v18h18M7 16l4-8 4 4 6-10"]
  },
  {
    "id": "apple",
    "label": "Apple",
    "paths": ["M22 12h-4l-3 9L9 3l-3 9H2"]
  },
  {
    "id": "android",
    "label": "Android",
    "paths": ["M8 2v4M16 2v4M12 22v-4M4 14h16M6 18h12M4 10h16M6 6h12"]
  },
  {
    "id": "chrome",
    "label": "Chrome",
    "paths": ["M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4L8.12 15.88"]
  },
  {
    "id": "firefox",
    "label": "Firefox",
    "paths": ["M22 7.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.5M2 7.5h20M6 3h12v4.5H6z"]
  },
  {
    "id": "safari",
    "label": "Safari",
    "paths": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"]
  },
  {
    "id": "edge",
    "label": "Edge",
    "paths": ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v4a2 2 0 0 0 2 2h4M10 12h8M10 16h8M10 8h2"]
  },
  {
    "id": "npm",
    "label": "npm",
    "paths": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 13l-2 2 2 2M14 13l2 2-2 2"]
  },
  {
    "id": "yarn",
    "label": "Yarn",
    "paths": ["M12 8V4H8M2 14h2M20 14h2M15 13v2M9 13v2M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"]
  },
  {
    "id": "pnpm",
    "label": "pnpm",
    "paths": ["M9.94 15.56 8 22l-1.94-6.44L0 13.5l6.06-2.06L8 5l1.94 6.44L16 13.5l-6.06 2.06zM19 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"]
  },
  {
    "id": "python",
    "label": "Python",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"]
  },
  {
    "id": "node",
    "label": "Node.js",
    "paths": ["M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"]
  },
  {
    "id": "java",
    "label": "Java",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2"]
  },
  {
    "id": "go",
    "label": "Go",
    "paths": ["M22 12h-6l-2 3H10l-2-3H2M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"]
  },
  {
    "id": "rust",
    "label": "Rust",
    "paths": ["M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"]
  },
  {
    "id": "php",
    "label": "PHP",
    "paths": ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"]
  },
  {
    "id": "ruby",
    "label": "Ruby",
    "paths": ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"]
  },
  {
    "id": "dotnet",
    "label": ".NET",
    "paths": ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"]
  },
  {
    "id": "swift",
    "label": "Swift",
    "paths": ["M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"]
  },
  {
    "id": "kotlin",
    "label": "Kotlin",
    "paths": ["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"]
  },
  {
    "id": "terraform",
    "label": "Terraform",
    "paths": ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35"]
  },
  {
    "id": "ansible",
    "label": "Ansible",
    "paths": ["M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z"]
  },
  {
    "id": "jenkins",
    "label": "Jenkins",
    "paths": ["M12 22V8M5 12H2a10 10 0 0 0 20 0h-3M12 2v2"]
  },
  {
    "id": "gitlab",
    "label": "GitLab",
    "paths": ["M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"]
  },
  {
    "id": "github",
    "label": "GitHub",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 14h.01M12 14h.01M16 14h.01M12 18h.01"]
  },
  {
    "id": "bitbucket",
    "label": "Bitbucket",
    "paths": ["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z"]
  },
  {
    "id": "jira",
    "label": "Jira",
    "paths": ["M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"]
  },
  {
    "id": "confluence",
    "label": "Confluence",
    "paths": ["M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"]
  },
  {
    "id": "slack",
    "label": "Slack",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01"]
  },
  {
    "id": "discord",
    "label": "Discord",
    "paths": ["M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"]
  },
  {
    "id": "teams",
    "label": "Teams",
    "paths": ["M12 5v14M5 12h14"]
  },
  {
    "id": "notion",
    "label": "Notion",
    "paths": ["M20 6 9 17l-5-5"]
  },
  {
    "id": "figma",
    "label": "Figma",
    "paths": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"]
  },
  {
    "id": "shopify",
    "label": "Shopify",
    "paths": ["M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"]
  },
  {
    "id": "wordpress",
    "label": "WordPress",
    "paths": ["M6 14.5V4a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.95 1.7A2 2 0 0 0 14.1 6H18a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"]
  }
];

const BY_ID = new Map(GROUP_ICONS.map((icon) => [icon.id, icon]));

export function getGroupIcon(iconId: string): GroupIconDef {
  return BY_ID.get(iconId) ?? BY_ID.get("folder")!;
}
