import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const STAFF = ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'];

const REPORT_TITLES = {
  'member-register': 'Member Register',
  'loan-portfolio': 'Loan Portfolio Report',
  'overdue-aging': 'Overdue / Aging Report',
  'disbursement-repayment': 'Disbursement & Repayment Report',
  income: 'Income Report',
};

// PDFKit's built-in Helvetica (base-14) font has no ₦ glyph — it renders as a broken box.
// Spell it out as "NGN" in PDFs instead of embedding a custom font for one character.
function nairaPdf(kobo) {
  return `NGN ${((kobo || 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

// Draws a simple bordered table starting at the document's current y position,
// paginating automatically when a row would run past the bottom margin.
function drawTable(doc, headers, rows, colWidths) {
  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = colWidths || headers.map(() => usableWidth / headers.length);
  const rowHeight = 20;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  function drawRow(cells, { bold = false } = {}) {
    if (doc.y + rowHeight > bottomLimit) {
      doc.addPage();
      drawRow(headers, { bold: true });
    }
    let x = startX;
    const y = doc.y;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    cells.forEach((cell, i) => {
      doc.text(String(cell ?? ''), x, y, { width: widths[i], ellipsis: true });
      x += widths[i];
    });
    doc.moveDown(0.6);
    doc.moveTo(startX, doc.y).lineTo(startX + usableWidth, doc.y).strokeColor('#dddddd').stroke();
    doc.moveDown(0.3);
  }

  drawRow(headers, { bold: true });
  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor('#888888').text('No data for this report yet.', startX, doc.y);
    doc.fillColor('#000000');
  } else {
    rows.forEach((row) => drawRow(row));
  }
}

async function buildPayload(type, { memberId, from, to }) {
  switch (type) {
    case 'member-register': {
      return prisma.member.findMany({ include: { savingsAccounts: true }, orderBy: { memberNo: 'asc' } });
    }
    case 'loan-statement': {
      if (!memberId) throw Object.assign(new Error('memberId required'), { status: 400 });
      return prisma.loan.findMany({
        where: { memberId: String(memberId) },
        include: { schedule: true, repayments: true, product: true },
      });
    }
    case 'loan-portfolio': {
      return prisma.loan.findMany({ include: { product: true, member: { select: { memberNo: true, firstName: true, lastName: true } } } });
    }
    case 'overdue-aging': {
      const now = new Date();
      const rows = await prisma.repaymentSchedule.findMany({
        where: { status: { not: 'PAID' }, dueDate: { lt: now } },
        include: { loan: { include: { member: true } } },
      });
      return rows.map((r) => {
        const daysLate = Math.floor((now - new Date(r.dueDate)) / (1000 * 60 * 60 * 24));
        const bucket = daysLate <= 30 ? '1-30' : daysLate <= 60 ? '31-60' : daysLate <= 90 ? '61-90' : '90+';
        return { loanId: r.loanId, member: r.loan.member.memberNo, daysLate, bucket, amountOwed: r.amountDue - r.amountPaid };
      });
    }
    case 'disbursement-repayment': {
      const where = {};
      if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
      return prisma.transaction.findMany({
        where: { ...where, type: { in: ['LOAN_DISBURSEMENT', 'LOAN_REPAYMENT'] } },
        orderBy: { createdAt: 'desc' },
      });
    }
    case 'income': {
      const income = await prisma.transaction.groupBy({
        by: ['type'], where: { type: { in: ['FEE', 'PENALTY'] } }, _sum: { amount: true },
      });
      const interest = await prisma.repaymentSchedule.aggregate({ _sum: { interest: true } });
      return { fees: income, interestBooked: interest._sum.interest || 0 };
    }
    default:
      throw Object.assign(new Error('Unknown report type'), { status: 400 });
  }
}

function renderPdf(doc, type, payload) {
  doc.fontSize(18).font('Helvetica-Bold').text(REPORT_TITLES[type] || type, { underline: false });
  doc.fontSize(9).font('Helvetica').fillColor('#888888').text(`Generated ${new Date().toLocaleString()}`);
  doc.fillColor('#000000');
  doc.moveDown();

  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  switch (type) {
    case 'member-register': {
      const headers = ['Member No', 'Name', 'Phone', 'Status', 'Savings'];
      const rows = payload.map((m) => [
        m.memberNo, `${m.firstName} ${m.lastName}`, m.phone || '—', m.status,
        nairaPdf(m.savingsAccounts.reduce((s, a) => s + a.balance, 0)),
      ]);
      drawTable(doc, headers, rows, [90, 140, 100, 80, usableWidth - 410]);
      break;
    }
    case 'loan-portfolio': {
      const headers = ['Member', 'Product', 'Amount', 'Tenure', 'Rate/Method', 'Status'];
      const rows = payload.map((l) => [
        `${l.member.firstName} ${l.member.lastName} (${l.member.memberNo})`,
        l.product.name, nairaPdf(l.amount), `${l.tenureMonths} mo`, `${l.rate}% ${l.method}`, l.status,
      ]);
      drawTable(doc, headers, rows, [160, 90, 80, 60, 90, usableWidth - 480]);
      break;
    }
    case 'overdue-aging': {
      const headers = ['Member', 'Days Late', 'Bucket', 'Amount Owed'];
      const rows = payload.map((r) => [r.member, r.daysLate, r.bucket, nairaPdf(r.amountOwed)]);
      drawTable(doc, headers, rows, [150, 90, 90, usableWidth - 330]);
      break;
    }
    case 'disbursement-repayment': {
      const headers = ['Date', 'Type', 'Amount', 'Method', 'Reference'];
      const rows = payload.map((t) => [
        new Date(t.createdAt).toLocaleDateString(), t.type.replaceAll('_', ' '),
        `${t.direction === 'CREDIT' ? '+' : '-'}${nairaPdf(t.amount)}`, t.method || '—', t.reference || '—',
      ]);
      drawTable(doc, headers, rows, [80, 130, 100, 90, usableWidth - 400]);
      break;
    }
    case 'income': {
      const headers = ['Category', 'Amount'];
      const rows = [
        ...payload.fees.map((f) => [f.type, nairaPdf(f._sum.amount)]),
        ['INTEREST BOOKED', nairaPdf(payload.interestBooked)],
      ];
      drawTable(doc, headers, rows, [usableWidth - 150, 150]);
      break;
    }
    default: {
      doc.fontSize(10).text('No renderer available for this report type.');
    }
  }
}

router.get('/:type', requireAuth, requireRole(...STAFF), async (req, res) => {
  const { type } = req.params;
  const { format = 'json', memberId, from, to } = req.query;

  let payload;
  try {
    payload = await buildPayload(type, { memberId, from, to });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.pdf"`);
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);
    renderPdf(doc, type, payload);
    doc.end();
    return;
  }

  res.json(payload);
});

export default router;
