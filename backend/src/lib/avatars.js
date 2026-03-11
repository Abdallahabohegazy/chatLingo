/**
 * Avatar image library - uses avatar.iran.liara.run (100 avatars)
 * Generates a random avatar URL when user has none
 */
const AVATAR_BASE_URL = "https://avatar.iran.liara.run/public";

export function getRandomAvatarFromLibrary() {
  const idx = Math.floor(Math.random() * 100) + 1;
  return `${AVATAR_BASE_URL}/${idx}.png`;
}
