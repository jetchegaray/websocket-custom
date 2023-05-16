export const weakRandomString = (len = 16) => {
  const hexChar = "0123456789abcdef";
  const hexLen = hexChar.length;
  const result = Array.from(Array(len), (_) =>
    hexChar.charAt(Math.floor(Math.random() * hexLen))
  );
  return result.join("") + Date.now();
};
