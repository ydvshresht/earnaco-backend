function isLeaderboardOpen() {
  const now = new Date();

  const hours = now.getHours(); // 0–23

  // Allow only 7 PM (19) to 12 AM (24)
  return hours >= 1 && hours < 4;
}

module.exports = { isLeaderboardOpen };
