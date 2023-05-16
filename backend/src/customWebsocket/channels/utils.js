// check if a user has sufficient balance for a swap
const userHasBalance = async (userId, curr, amount) => {
  //we can check in the DB if he has.
  return true;
};

const safeWei = (wei) => {
  if (typeof wei !== "string") return false;
  if (!/^\d+$/.test(wei)) return false;
  if (wei.length !== 0 && wei.charAt(0) === "0") return false;
  return true;
};

module.exports = {
  userHasBalance,
  safeWei,
};
