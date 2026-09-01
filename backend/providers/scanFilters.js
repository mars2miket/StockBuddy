//const THRESHOLDS = {
//  minChangePercent: 10,   // %Chg >= 10%
//  minRvol: 2,              // RVOL >= 2x
//  maxFloat: 20_000_000,    // Float <= 20M shares
//};

const THRESHOLDS = {
  minChangePercent: .1,     // temporarily lowered from 10 for testing
  minRvol: 1,             // temporarily lowered from 2 for testing
  maxFloat: 500_000_000,  // temporarily raised from 20M for testing
};

function meetsConditions(stock) {
  if (stock.changePercent == null || stock.changePercent < THRESHOLDS.minChangePercent) return false;
  if (stock.rvol == null || stock.rvol < THRESHOLDS.minRvol) return false;
  if (stock.float == null || stock.float > THRESHOLDS.maxFloat) return false;
  return true;
}

module.exports = { meetsConditions, THRESHOLDS };

