type NotArray<T> = T extends Array<infer U> ? never : T;

export const pickRandomElement = <T>(array: Array<NotArray<T>>): T => {
  return array[Math.floor(Math.random() * array.length)];
};
