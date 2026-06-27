// routes/stats.js — dashboard stats + leaderboard

const express     = require('express');
const Calculation = require('../models/Calculation');
const User        = require('../models/User');
const { protect } = require('../middleware/auth');
const logger      = require('../utils/logger');

const router = express.Router();
router.use(protect);

const PAKISTAN_DAILY = 2.74;
const WORLD_DAILY    = 10.9;

// ════════════════════════════════════════════
// GET /api/stats/dashboard
// ════════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
  try {
    const calcs = await Calculation
      .find({ userId: req.user._id })
      .sort({ createdAt: 1 })
      .lean();

    if (!calcs.length) {
      return res.status(200).json({
        success: true,
        stats: {
          totalEntries: 0, avgCO2: 0, totalCO2: 0,
          totalTrees: 0, streak: req.user.streak || 0,
          xp: req.user.xp, level: req.user.level,
          vsPakistan: null, trend: [], categoryTotals: {},
          latestEntry: null,
        },
      });
    }

    const co2s       = calcs.map(c => c.totalCO2);
    const avgCO2     = co2s.reduce((a,b)=>a+b,0) / co2s.length;
    const totalCO2   = co2s.reduce((a,b)=>a+b,0);
    const totalTrees = calcs.reduce((a,c) => a+(c.treesPerYear||0), 0);

    const vsPakistan = {
      yourAvg:  parseFloat(avgCO2.toFixed(2)),
      pakAvg:   PAKISTAN_DAILY,
      worldAvg: WORLD_DAILY,
      pctDiff:  parseFloat(((PAKISTAN_DAILY-avgCO2)/PAKISTAN_DAILY*100).toFixed(1)),
      status:   avgCO2 < PAKISTAN_DAILY ? 'below'
              : avgCO2 < WORLD_DAILY    ? 'average' : 'high',
    };

    // Aggregate categories across all entries
    const categoryTotals = {
      car:0, publicTransport:0, meals:0,
      electricity:0, flights:0, waste:0,
    };
    calcs.forEach(c => {
      if (c.categories) {
        Object.keys(categoryTotals).forEach(k => {
          categoryTotals[k] += c.categories[k] || 0;
        });
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalEntries: calcs.length,
        avgCO2:       parseFloat(avgCO2.toFixed(2)),
        totalCO2:     parseFloat(totalCO2.toFixed(2)),
        totalTrees:   parseFloat(totalTrees.toFixed(1)),
        streak:       req.user.streak || 0,
        xp:           req.user.xp    || 0,
        level:        req.user.level || 1,
        vsPakistan,
        trend:        calcs.map(c => ({ date: c.date, co2: c.totalCO2, trees: c.treesPerYear })),
        categoryTotals,
        latestEntry:  calcs[calcs.length - 1],
      },
    });
  } catch (error) {
    logger.error(`Dashboard stats error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ════════════════════════════════════════════
// GET /api/stats/leaderboard
// Ranks by XP & level; merges real users with seed demo data
// ════════════════════════════════════════════
const {
  SEED_LEADERBOARD,
  getLevelLabel,
  getInitials,
  sortLeaderboard,
  qualifiesForBoard,
} = require('../utils/leaderboard');

router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ isActive: true }, 'name location level xp streak').lean();

    const realEntries = (
      await Promise.all(
        users.map(async (user) => {
          const calcs = await Calculation.find({ userId: user._id }, 'totalCO2').lean();
          const co2s  = calcs.map(c => c.totalCO2);
          const avg   = co2s.length ? co2s.reduce((a, b) => a + b, 0) / co2s.length : null;
          const isYou = user._id.toString() === req.user._id.toString();

          if (!qualifiesForBoard(user, calcs.length) && !isYou) return null;

          return {
            name:       user.name,
            location:   user.location,
            level:      user.level || 1,
            xp:         user.xp || 0,
            avgCO2:     avg !== null ? parseFloat(avg.toFixed(2)) : null,
            entries:    calcs.length,
            levelLabel: getLevelLabel(user.level || 1),
            initials:   getInitials(user.name),
            isYou,
            isSeed:     false,
          };
        })
      )
    ).filter(Boolean);

    const seedEntries = SEED_LEADERBOARD.map(s => ({
      ...s,
      levelLabel: getLevelLabel(s.level),
      initials:   getInitials(s.name),
      isYou:      false,
      isSeed:     true,
    }));

    const fullBoard = [...realEntries, ...seedEntries].sort(sortLeaderboard);
    const leaderboard = fullBoard.slice(0, 10);

    const youEntry = realEntries.find(u => u.isYou);
    const myRank   = youEntry ? fullBoard.findIndex(u => u.isYou) + 1 : null;

    res.status(200).json({
      success:     true,
      leaderboard,
      myRank,
      total:       fullBoard.length,
      youInTop:    leaderboard.some(u => u.isYou),
      realCount:   realEntries.length,
    });
  } catch (error) {
    logger.error(`Leaderboard error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
