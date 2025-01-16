const getColorFromAccount = (account: string): string => {
  // Simple hash function to generate a number from the account string
  const hash = account.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Convert to HSL to ensure good contrast and saturation
  const hue = Math.abs(hash) % 360;
  return `\x1b[38;2;${HSLToRGB(hue, 70, 50).join(";")}m`;
};

const HSLToRGB = (
  h: number,
  s: number,
  l: number
): [number, number, number] => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
};

export const log = (account: string, ...args: Parameters<typeof console.log>) =>
  console.log(`${getColorFromAccount(account)} ${account}\x1b[0m`, ...args);
