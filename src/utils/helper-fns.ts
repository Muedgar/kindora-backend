export const removeKey = <T>(obj: T, keyToRemove: keyof T): T => {
  const { [keyToRemove]: _, ...rest } = obj;
  return rest as T;
};
