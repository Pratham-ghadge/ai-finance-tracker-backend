import { expenseCategories, incomeCategories } from './constants.js';

const parseAmount = (value) => {
  const cleaned = `${value || ''}`.replace(/[^0-9.-]/g, '');
  return Number.parseFloat(cleaned);
};

const parseDateValue = (value) => {
  if (!value) {
    return new Date();
  }

  const normalized = value.trim();
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const match = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const [, day, month, year] = match;
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return new Date(`${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
  }

  return new Date();
};

const splitCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

export const parseCsvTransactions = (csvText) => {
  const rows = `${csvText || ''}`
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one transaction row');
  }

  const headers = splitCsvLine(rows[0]).map((header) => header.toLowerCase());

  return rows.slice(1).map((row, index) => {
    const values = splitCsvLine(row);
    const record = headers.reduce((accumulator, header, headerIndex) => {
      accumulator[header] = values[headerIndex];
      return accumulator;
    }, {});

    const amount = parseAmount(record.amount);
    if (!amount) {
      throw new Error(`CSV row ${index + 2} has an invalid amount`);
    }

    return {
      amount,
      category: record.category || 'Others',
      date: parseDateValue(record.date),
      description: record.description || record.note || 'Imported from CSV',
      type: (record.type || 'EXPENSE').toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE',
      accountName: record.account || '',
      source: 'CSV',
    };
  });
};

const inferCategory = (message) => {
  const lower = message.toLowerCase();

  if (/(swiggy|zomato|restaurant|cafe|food|dining)/.test(lower)) return 'Food';
  if (/(uber|ola|metro|flight|travel|irctc|cab|fuel|petrol)/.test(lower)) return 'Travel';
  if (/(electricity|water bill|gas bill|broadband|mobile recharge|bill)/.test(lower)) return 'Bills';
  if (/(amazon|flipkart|mall|shopping|store|purchase)/.test(lower)) return 'Shopping';
  if (/(salary|payroll)/.test(lower)) return 'Salary';
  if (/(mutual fund|sip|dividend|investment)/.test(lower)) return 'Investment';

  return 'Others';
};

const inferDescription = (message) => {
  const merchantMatch = message.match(/\b(?:at|to|from)\s+([A-Za-z0-9&.\- ]{3,40})/i);
  if (merchantMatch) {
    return merchantMatch[1].trim();
  }

  return message.slice(0, 60).trim();
};

export const parseSmsTransactions = (smsText) => {
  const messages = `${smsText || ''}`
    .split(/\n\s*\n/)
    .map((message) => message.trim())
    .filter(Boolean);

  if (!messages.length) {
    throw new Error('Paste at least one SMS message to import');
  }

  return messages.map((message) => {
    const amountMatch =
      message.match(/(?:inr|rs\.?|usd|\$)\s?([\d,]+(?:\.\d{1,2})?)/i) ||
      message.match(/amount\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i);
    const amount = parseAmount(amountMatch?.[1]);

    if (!amount) {
      throw new Error(`Could not detect an amount in SMS: "${message.slice(0, 40)}..."`);
    }

    const isIncome = /(credited|received|deposit|salary|refund|credited to|cr\b)/i.test(message);
    const type = isIncome ? 'INCOME' : 'EXPENSE';
    const dateMatch = message.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    const category = inferCategory(message);
    const categoryList = type === 'INCOME' ? incomeCategories : expenseCategories;

    return {
      amount,
      category: categoryList.includes(category) ? category : categoryList[categoryList.length - 1],
      date: parseDateValue(dateMatch?.[1]),
      description: inferDescription(message),
      type,
      source: 'SMS',
      smsRaw: message,
    };
  });
};
