import { type ofxTypes, parseStrict } from "ofx-js";

type BankAccount = ofxTypes.BankAccount;
type CreditCardAccount = ofxTypes.CreditCardAccount;
type InvestmentAccount = ofxTypes.InvestmentAccount;
type InvestmentTransactionList = ofxTypes.InvestmentTransactionList;
type ParsedOFX = ofxTypes.ParsedOFX;
type StatementTransaction = ofxTypes.StatementTransaction;

export type FinanceKind = "ofx" | "qfx" | "qif";

export interface FinanceAccount {
	id: string;
	name: string;
	type: string;
	currency: string;
	ledgerBalance: string;
	availableBalance: string;
	asOf: string;
}

export interface FinanceTransaction {
	id: string;
	account: string;
	date: string;
	payee: string;
	memo: string;
	category: string;
	type: string;
	number: string;
	amount: string;
}

export interface FinanceDocument {
	kind: FinanceKind;
	institution: string;
	accounts: FinanceAccount[];
	transactions: FinanceTransaction[];
}

function listOf<T>(value: T | T[] | undefined): T[] {
	if (value == null) return [];
	return Array.isArray(value) ? value : [value];
}

function formatOfxDate(value: string | undefined): string {
	if (!value) return "";
	const digits = value.slice(0, 8);
	if (!/^\d{8}$/.test(digits)) return value;
	return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function formatQifDate(value: string): string {
	const cleaned = value.trim().replace("'", "/");
	const parts = cleaned.split(/[/-]/);
	if (parts.length !== 3) return value.trim();
	let [month, day, year] = parts;
	if (!(month && day && year)) return value.trim();
	if (year.length === 2) {
		const shortYear = Number(year);
		year = String(shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear);
	}
	if (month.length === 1) month = `0${month}`;
	if (day.length === 1) day = `0${day}`;
	if (!/^\d{4}$/.test(year)) return value.trim();
	return `${year}-${month}-${day}`;
}

function accountTitle(
	account: BankAccount | CreditCardAccount | InvestmentAccount,
): string {
	if ("ACCTTYPE" in account && account.ACCTTYPE) {
		return `${account.ACCTID} · ${account.ACCTTYPE}`;
	}
	return account.ACCTID;
}

function pushTransaction(rows: FinanceTransaction[], row: FinanceTransaction) {
	const duplicate = rows.some((item) => item.id === row.id);
	rows.push(duplicate ? { ...row, id: `${row.id}:${rows.length}` } : row);
}

function bankTransactions(
	transactions: StatementTransaction | StatementTransaction[] | undefined,
	account: string,
	pending: boolean,
): FinanceTransaction[] {
	return listOf(transactions).map((transaction) => ({
		id: transaction.FITID,
		account,
		date: formatOfxDate(transaction.DTPOSTED),
		payee: transaction.NAME ?? transaction.PAYEE?.NAME ?? "",
		memo: transaction.MEMO ?? "",
		category: "",
		type: pending ? `${transaction.TRNTYPE} · pending` : transaction.TRNTYPE,
		number: transaction.CHECKNUM ?? transaction.REFNUM ?? "",
		amount: transaction.TRNAMT,
	}));
}

interface InvestmentLike {
	INVTRAN?: { FITID?: string; DTTRADE?: string; MEMO?: string };
	TOTAL?: string;
	SECID?: { UNIQUEID?: string };
}

function investmentTransactions(
	transactions: InvestmentTransactionList | undefined,
	account: string,
): FinanceTransaction[] {
	if (!transactions) return [];
	const rows: FinanceTransaction[] = [];
	for (const [key, value] of Object.entries(transactions)) {
		if (key === "DTSTART" || key === "DTEND" || value == null) continue;
		for (const item of listOf(value as InvestmentLike | InvestmentLike[])) {
			const core = item.INVTRAN;
			if (!core?.DTTRADE) continue;
			rows.push({
				id: core.FITID || `${account}:${key}:${core.DTTRADE}`,
				account,
				date: formatOfxDate(core.DTTRADE),
				payee: item.SECID?.UNIQUEID ?? key,
				memo: core.MEMO ?? "",
				category: "",
				type: key,
				number: "",
				amount: item.TOTAL ?? "",
			});
		}
	}
	return rows;
}

function parseOfx(text: string, kind: "ofx" | "qfx"): FinanceDocument {
	let parsed: ParsedOFX;
	try {
		parsed = parseStrict(text);
	} catch {
		throw new Error("This file is not a valid OFX statement");
	}
	const body = parsed.OFX;
	const accounts: FinanceAccount[] = [];
	const transactions: FinanceTransaction[] = [];

	for (const response of listOf(body.BANKMSGSRSV1?.STMTTRNRS)) {
		const statement = response.STMTRS;
		if (!statement) continue;
		const account = statement.BANKACCTFROM;
		accounts.push({
			id: account.ACCTID,
			name: accountTitle(account),
			type: account.ACCTTYPE,
			currency: statement.CURDEF,
			ledgerBalance: statement.LEDGERBAL?.BALAMT ?? "",
			availableBalance: statement.AVAILBAL?.BALAMT ?? "",
			asOf: formatOfxDate(statement.LEDGERBAL?.DTASOF),
		});
		transactions.push(
			...bankTransactions(
				statement.BANKTRANLIST?.STMTTRN,
				account.ACCTID,
				false,
			),
			...listOf(statement.BANKTRANLISTP?.STMTTRNP).map((transaction) => ({
				id: transaction.REFNUM || `${account.ACCTID}:${transaction.DTTRAN}`,
				account: account.ACCTID,
				date: formatOfxDate(transaction.DTTRAN),
				payee: transaction.NAME,
				memo: transaction.MEMO ?? "",
				category: "",
				type: `${transaction.TRNTYPE} · pending`,
				number: transaction.REFNUM ?? "",
				amount: transaction.TRNAMT,
			})),
		);
	}

	for (const response of listOf(body.CREDITCARDMSGSRSV1?.CCSTMTTRNRS)) {
		const statement = response.CCSTMTRS;
		if (!statement) continue;
		const account = statement.CCACCTFROM;
		accounts.push({
			id: account.ACCTID,
			name: account.ACCTID,
			type: "CREDITCARD",
			currency: statement.CURDEF,
			ledgerBalance: statement.LEDGERBAL?.BALAMT ?? "",
			availableBalance: statement.AVAILBAL?.BALAMT ?? "",
			asOf: formatOfxDate(statement.LEDGERBAL?.DTASOF),
		});
		transactions.push(
			...bankTransactions(
				statement.BANKTRANLIST?.STMTTRN,
				account.ACCTID,
				false,
			),
		);
	}

	for (const response of listOf(body.INVSTMTMSGSRSV1?.INVSTMTTRNRS)) {
		const statement = response.INVSTMTRS;
		if (!statement) continue;
		const account = statement.INVACCTFROM;
		accounts.push({
			id: account.ACCTID,
			name: account.ACCTID,
			type: "INVESTMENT",
			currency: statement.CURDEF,
			ledgerBalance: statement.INVBAL?.AVAILCASH ?? "",
			availableBalance: "",
			asOf: formatOfxDate(statement.DTASOF),
		});
		transactions.push(
			...investmentTransactions(statement.INVTRANLIST, account.ACCTID),
		);
	}

	transactions.sort((left, right) => right.date.localeCompare(left.date));
	return {
		kind,
		institution: body.SIGNONMSGSRSV1?.SONRS?.FI?.ORG ?? "",
		accounts,
		transactions,
	};
}

interface QifRecord {
	date: string;
	amount: string;
	payee: string;
	memo: string;
	category: string;
	number: string;
	cleared: string;
	name: string;
	type: string;
}

function emptyRecord(): QifRecord {
	return {
		date: "",
		amount: "",
		payee: "",
		memo: "",
		category: "",
		number: "",
		cleared: "",
		name: "",
		type: "",
	};
}

interface QifState {
	mode: "transaction" | "account";
	accountType: string;
	accountId: string;
	record: QifRecord;
	sawMarker: boolean;
	accounts: FinanceAccount[];
	transactions: FinanceTransaction[];
}

function qifText(value: string, fallback: string): string {
	return value ? value : fallback;
}

function commitQifRecord(state: QifState) {
	const { record } = state;
	if (state.mode === "account") {
		const id = qifText(record.name, qifText(state.accountType, "Account"));
		state.accountId = id;
		state.accounts.push({
			id,
			name: qifText(record.name, id),
			type: qifText(record.type, state.accountType),
			currency: "",
			ledgerBalance: record.amount,
			availableBalance: "",
			asOf: record.date ? formatQifDate(record.date) : "",
		});
	} else if (record.date || record.amount || record.payee) {
		const id = qifText(state.accountId, qifText(state.accountType, "Account"));
		ensureQifAccount(state, id);
		pushTransaction(state.transactions, {
			id: `${id}:${record.date}:${record.amount}:${record.payee}:${state.transactions.length}`,
			account: id,
			date: formatQifDate(record.date),
			payee: record.payee,
			memo: record.memo,
			category: record.category,
			type: record.cleared,
			number: record.number,
			amount: record.amount,
		});
	}
	state.record = emptyRecord();
}

function ensureQifAccount(state: QifState, id: string) {
	if (state.accounts.some((account) => account.id === id)) return;
	state.accounts.push({
		id,
		name: id,
		type: state.accountType,
		currency: "",
		ledgerBalance: "",
		availableBalance: "",
		asOf: "",
	});
}

function appendQifText(current: string, value: string): string {
	return current ? `${current} ${value}` : value;
}

function appendQifCategory(current: string, value: string): string {
	return current ? `${current}, ${value}` : value;
}

function applyQifField(state: QifState, code: string, value: string) {
	const { record } = state;
	if (code === "D") record.date = value;
	else if (code === "T" || (code === "U" && !record.amount))
		record.amount = value;
	else if (code === "P") record.payee = value;
	else if (code === "M" || code === "A" || code === "$" || code === "E") {
		record.memo = appendQifText(record.memo, value);
	} else if (code === "L" || code === "S") {
		record.category = appendQifCategory(record.category, value);
	} else if (code === "C") record.cleared = value;
	else if (code === "N" && state.mode === "account") record.name = value;
	else if (code === "N") record.number = value;
}

function applyQifHeader(state: QifState, header: string) {
	if (/^account\b/i.test(header)) {
		state.mode = "account";
		return;
	}
	if (/^type:/i.test(header)) {
		state.mode = "transaction";
		state.accountType = header.slice(header.indexOf(":") + 1).trim();
		state.accountId = state.accountType;
	}
}

function parseQifRecords(text: string): {
	accounts: FinanceAccount[];
	transactions: FinanceTransaction[];
} {
	const state: QifState = {
		mode: "transaction",
		accountType: "",
		accountId: "",
		record: emptyRecord(),
		sawMarker: false,
		accounts: [],
		transactions: [],
	};
	for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
		const line = raw.trim();
		if (!line) continue;
		if (line.startsWith("!")) {
			commitQifRecord(state);
			state.sawMarker = true;
			applyQifHeader(state, line.slice(1));
			continue;
		}
		if (line === "^") {
			state.sawMarker = true;
			commitQifRecord(state);
			continue;
		}
		applyQifField(state, line[0]?.toUpperCase() ?? "", line.slice(1).trim());
	}
	commitQifRecord(state);
	if (!state.sawMarker) throw new Error("This file is not a QIF statement");
	state.transactions.sort((left, right) => right.date.localeCompare(left.date));
	return { accounts: state.accounts, transactions: state.transactions };
}

function parseQif(text: string): FinanceDocument {
	const { accounts, transactions } = parseQifRecords(text);
	return { kind: "qif", institution: "", accounts, transactions };
}

export function parseFinance(text: string, kind: FinanceKind): FinanceDocument {
	const trimmed = text.trim();
	if (!trimmed) throw new Error("The file is empty");
	if (kind === "qif") return parseQif(trimmed);
	return parseOfx(trimmed, kind);
}
