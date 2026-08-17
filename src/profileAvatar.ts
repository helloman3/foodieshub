const avatarBackgrounds = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'c0f2b5'];

const seedFromName = (name: string) => encodeURIComponent(name.trim().toLowerCase() || 'foodiehub');

export const getProfileAvatar = (name: string) => {
  const background = avatarBackgrounds[(name.trim().length || 1) % avatarBackgrounds.length];
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seedFromName(name)}&backgroundColor=${background}`;
};

export const getAvatarFallback = (name: string) => {
  const initials = (name.trim() || 'FH')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const background = avatarBackgrounds[(name.trim().length || 1) % avatarBackgrounds.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#${background}"/><text x="48" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#315d00">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
