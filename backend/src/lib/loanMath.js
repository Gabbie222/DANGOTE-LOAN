// All money amounts are integers in kobo (naira * 100). Never use floats for money.

export function calculateFlat(principalKobo, annualRatePct, tenureMonths) {
  const r = annualRatePct / 100;
  const totalInterest = Math.round(principalKobo * r * (tenureMonths / 12));
  const totalPayable = principalKobo + totalInterest;
  const monthlyPayment = Math.round(totalPayable / tenureMonths);
  return { totalInterest, totalPayable, monthlyPayment };
}

export function calculateReducing(principalKobo, annualRatePct, tenureMonths) {
  const i = annualRatePct / 100 / 12;
  let monthlyPayment;
  if (i === 0) {
    monthlyPayment = Math.round(principalKobo / tenureMonths);
  } else {
    const factor = Math.pow(1 + i, tenureMonths);
    monthlyPayment = Math.round((principalKobo * i * factor) / (factor - 1));
  }
  const totalPayable = monthlyPayment * tenureMonths;
  const totalInterest = totalPayable - principalKobo;
  return { totalInterest, totalPayable, monthlyPayment };
}

export function calculateLoan(principalKobo, annualRatePct, tenureMonths, method) {
  return method === 'REDUCING'
    ? calculateReducing(principalKobo, annualRatePct, tenureMonths)
    : calculateFlat(principalKobo, annualRatePct, tenureMonths);
}

// Generates the instalment-by-instalment schedule (used for reducing-balance amortization,
// and evenly split for flat-rate) so principal/interest per instalment sum to the totals above.
export function generateSchedule(principalKobo, annualRatePct, tenureMonths, method, startDate) {
  const rows = [];
  const i = annualRatePct / 100 / 12;
  let balance = principalKobo;
  const { monthlyPayment } = calculateLoan(principalKobo, annualRatePct, tenureMonths, method);

  for (let n = 1; n <= tenureMonths; n++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + n);

    let interest, principal;
    if (method === 'REDUCING') {
      interest = Math.round(balance * i);
      principal = n === tenureMonths ? balance : monthlyPayment - interest;
    } else {
      const totalInterest = Math.round(principalKobo * (annualRatePct / 100) * (tenureMonths / 12));
      interest = Math.round(totalInterest / tenureMonths);
      principal = n === tenureMonths ? balance : Math.round(principalKobo / tenureMonths);
    }
    balance -= principal;
    if (balance < 0) balance = 0;

    rows.push({
      instalmentNo: n,
      dueDate,
      principal,
      interest,
      amountDue: principal + interest,
    });
  }
  return rows;
}

export function computeMaxLoan({ productMaxAmount, savingsBalance, multiplier, existingOutstanding }) {
  const capBySavings = Math.round(savingsBalance * multiplier);
  const max = Math.min(productMaxAmount, capBySavings) - existingOutstanding;
  return Math.max(0, max);
}

export function monthsBetween(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}
