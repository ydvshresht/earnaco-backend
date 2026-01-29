function isLeaderboardOpen() {
  const now = new Date();
  const hours = now.getHours(); // 0–23

  // 7 PM (19) to 12 AM (24 / 0)
  return hours >= 19 || hours === 0;
}

module.exports = { isLeaderboardOpen };
