/**
 * How the columns in your Google Sheets workbook line up with what the app
 * stores.
 *
 * Column names are matched loosely — case, spacing and punctuation are ignored,
 * and a partial match counts. So "RECEIVED", "Amount Received" and "received "
 * all find the same field. If a column in your workbook is named something
 * completely different, add it to the list here rather than renaming your sheet.
 *
 * `key` is what makes a row identifiable. Re-running the import matches on
 * those fields, so importing twice does not create two copies. Choose fields
 * that together identify a row, and that nobody edits afterwards.
 */
export const SHEETS = {
  transactions: {
    match: /transaction|data.?entry|entries|daily|work.?sheet/i,
    label: 'Data Entry / transactions',
    columns: {
      date:     ['date', 'entry date'],
      company:  ['company', 'client', 'customer', 'company name'],
      employee: ['employee', 'staff', 'worker', 'name'],
      work:     ['work', 'service', 'task', 'work item', 'description'],
      received: ['received', 'amount received', 'receipt', 'income'],
      expense:  ['expense', 'cost', 'expenses', 'govt', 'government'],
      profit:   ['profit', 'margin', 'net'],
      paidFrom: ['paidfrom', 'paid from', 'account', 'source', 'paid by'],
    },
    dates: ['date'],
    numbers: ['received', 'expense', 'profit'],
    required: ['date'],
    key: ['date', 'company', 'employee', 'work', 'received', 'expense'],
    // profit should equal received - expense; anything else gets reported
    checkProfit: true,
  },

  payments: {
    match: /payment|receipt|collection/i,
    label: 'Payments received',
    columns: {
      date:    ['date', 'payment date'],
      amount:  ['amount', 'paid', 'received'],
      company: ['company', 'client', 'customer', 'company name'],
      account: ['account', 'received into', 'bank', 'paid into'],
      remark:  ['remark', 'remarks', 'note', 'notes', 'description'],
    },
    dates: ['date'],
    numbers: ['amount'],
    required: ['date'],
    key: ['date', 'company', 'amount', 'remark'],
  },

  ledger: {
    match: /cash.?book|ledger|bank.?book/i,
    label: 'Cash book',
    columns: {
      date:    ['date'],
      account: ['account', 'cash', 'bank'],
      amount:  ['amount', 'value'],
      remark:  ['remark', 'remarks', 'note', 'notes', 'description', 'particulars'],
      company: ['company', 'client'],
    },
    dates: ['date'],
    numbers: ['amount'],
    required: ['date', 'account'],
    key: ['date', 'account', 'amount', 'remark'],
  },

  rates: {
    match: /rate|price|master/i,
    label: 'Rates master',
    columns: {
      item: ['item', 'service', 'work', 'description', 'name'],
      rate: ['rate', 'price', 'charge', 'amount'],
      fee:  ['fee', 'service fee', 'our fee'],
    },
    numbers: ['rate', 'fee'],
    required: ['item'],
    key: ['item'],
  },

  invoices: {
    match: /invoice(?!.*item)(?!.*line)|bill(?!.*item)/i,
    label: 'Invoices',
    columns: {
      InvoiceNo:    ['invoiceno', 'invoice no', 'invoice number', 'inv no'],
      InvoiceDate:  ['invoicedate', 'invoice date', 'date'],
      BillTo:       ['billto', 'bill to', 'company', 'customer', 'client'],
      Applicant:    ['applicant', 'for'],
      ContactInfo:  ['contactinfo', 'contact', 'phone'],
      ServiceType:  ['servicetype', 'service type', 'service'],
      CustomerTRN:  ['customertrn', 'customer trn', 'trn'],
      GovtSubtotal: ['govtsubtotal', 'govt subtotal', 'government', 'govt'],
      ServiceFee:   ['servicefee', 'service fee', 'fee'],
      VAT:          ['vat', 'tax'],
      GrandTotal:   ['grandtotal', 'grand total', 'total'],
    },
    dates: ['InvoiceDate'],
    numbers: ['GovtSubtotal', 'ServiceFee', 'VAT', 'GrandTotal'],
    required: ['InvoiceNo'],
    key: ['InvoiceNo'],
  },

  invoiceItems: {
    match: /invoice.?(item|line)|bill.?item/i,
    label: 'Invoice lines',
    columns: {
      invoiceNo: ['invoiceno', 'invoice no', 'invoice number', 'inv no'],
      sr:        ['sr', 'sr no', 'serial', 'line', '#'],
      desc:      ['desc', 'description', 'item', 'particulars'],
      qty:       ['qty', 'quantity', 'nos'],
      rate:      ['rate', 'price', 'unit price'],
      amount:    ['amount', 'total', 'value'],
    },
    numbers: ['qty', 'rate', 'amount'],
    required: ['invoiceNo'],
    key: ['invoiceNo', 'sr', 'desc'],
  },

  contacts: {
    match: /contact|phone|directory/i,
    label: 'Contacts',
    columns: {
      name:  ['name', 'company', 'customer', 'contact'],
      phone: ['phone', 'mobile', 'number', 'contact no'],
    },
    required: ['name'],
    key: ['name', 'phone'],
  },

  employees: {
    match: /employee|staff|worker/i,
    label: 'Employees',
    columns: {
      name:    ['name', 'employee'],
      company: ['company', 'employer'],
      note:    ['note', 'notes', 'remark', 'designation'],
    },
    required: ['name'],
    key: ['name', 'company'],
  },

  insurance: {
    match: /insurance|policy|medical/i,
    label: 'Insurance',
    columns: {
      company:   ['company', 'client'],
      eid:       ['eid', 'emirates id', 'id'],
      worker:    ['worker', 'employee', 'name', 'insured'],
      coverage:  ['coverage', 'plan', 'cover'],
      inception: ['inception', 'start', 'from', 'issue date'],
      expiry:    ['expiry', 'expires', 'to', 'end'],
      category:  ['category', 'type', 'class'],
      invoiceNo: ['invoiceno', 'invoice no'],
      premium:   ['premium', 'amount'],
      total:     ['total', 'grand total'],
    },
    dates: ['inception', 'expiry'],
    numbers: ['premium', 'total'],
    required: ['worker'],
    key: ['company', 'worker', 'inception', 'expiry'],
  },

  visa: {
    match: /visa|immigration|file/i,
    label: 'Visa tracker',
    columns: {
      company:  ['company', 'client'],
      employee: ['employee', 'worker', 'name', 'applicant'],
      steps:    ['steps', 'status', 'stage', 'progress'],
    },
    required: ['employee'],
    key: ['company', 'employee'],
  },
};
