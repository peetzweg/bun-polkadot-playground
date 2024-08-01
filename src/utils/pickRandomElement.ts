export const pickRandomElement = <T>(array: Array<T>): T => {
  return array[Math.floor(Math.random() * array.length)];
};
