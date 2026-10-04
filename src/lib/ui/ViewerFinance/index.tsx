import {
	Badge,
	Button,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Table,
	Text,
} from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import type {
	FinanceAccount,
	FinanceDocument,
	FinanceTransaction,
} from "@/lib/utils/finance/parse";
import styles from "./styles.module.scss";

function amountNumber(value: string): number | null {
	const numeric = Number(value.replaceAll(",", ""));
	return Number.isFinite(numeric) ? numeric : null;
}

function formatAmount(value: string): string {
	const numeric = amountNumber(value);
	if (numeric == null) return value;
	return numeric.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function amountColor(value: string): string | undefined {
	const numeric = amountNumber(value);
	if (numeric == null || numeric === 0) return undefined;
	return numeric < 0 ? "red" : "teal";
}

function TransactionRow({ transaction }: { transaction: FinanceTransaction }) {
	return (
		<Table.Tr>
			<Table.Td w={110}>{transaction.date}</Table.Td>
			<Table.Td>
				<Text className={styles.payee} size="sm" title={transaction.payee}>
					{transaction.payee || "—"}
				</Text>
				{transaction.memo ? (
					<Text size="xs" c="dimmed" className={styles.payee}>
						{transaction.memo}
					</Text>
				) : null}
			</Table.Td>
			<Table.Td>
				<Text className={styles.payee} size="sm">
					{transaction.category}
				</Text>
			</Table.Td>
			<Table.Td>
				<Text className={styles.payee} size="xs">
					{transaction.type}
					{transaction.number ? ` ${transaction.number}` : ""}
				</Text>
			</Table.Td>
			<Table.Td w={120} ta="right">
				<Text size="sm" c={amountColor(transaction.amount)} fw={600}>
					{formatAmount(transaction.amount)}
				</Text>
			</Table.Td>
		</Table.Tr>
	);
}

function AccountSection({
	account,
	selected,
	choose,
	onSelect,
}: {
	account: FinanceAccount;
	selected: boolean;
	choose: boolean;
	onSelect: (id: string) => void;
}) {
	const selectAccount = useCallback(() => {
		onSelect(account.id);
	}, [account.id, onSelect]);

	return (
		<Stack gap={6}>
			{choose ? (
				<Button
					size="compact-xs"
					variant={selected ? "light" : "default"}
					onClick={selectAccount}
				>
					{account.name}
				</Button>
			) : null}
			<AccountCard account={account} />
		</Stack>
	);
}

function AccountCard({ account }: { account: FinanceAccount }) {
	return (
		<Stack gap={4}>
			<Text size="sm" fw={600}>
				{account.name}
			</Text>
			<Text size="xs" c="dimmed">
				{account.type || "Account"}
				{account.currency ? ` · ${account.currency}` : ""}
			</Text>
			{account.ledgerBalance ? (
				<Text size="sm">Balance {formatAmount(account.ledgerBalance)}</Text>
			) : null}
			{account.availableBalance ? (
				<Text size="xs" c="dimmed">
					Available {formatAmount(account.availableBalance)}
				</Text>
			) : null}
			{account.asOf ? (
				<Text size="xs" c="dimmed">
					As of {account.asOf}
				</Text>
			) : null}
		</Stack>
	);
}

export default function ViewerFinance({
	statement,
}: {
	statement: FinanceDocument;
}) {
	const [accountId, setAccountId] = useState("all");
	const transactions = useMemo(() => {
		if (accountId === "all") return statement.transactions;
		return statement.transactions.filter((item) => item.account === accountId);
	}, [accountId, statement.transactions]);
	const total = transactions.reduce((sum, item) => {
		const numeric = amountNumber(item.amount);
		return numeric == null ? sum : sum + numeric;
	}, 0);
	const currency = statement.accounts.find((item) => item.currency)?.currency;
	const selectAccount = useCallback((id: string) => {
		setAccountId(id);
	}, []);
	const showAllAccounts = useCallback(() => {
		selectAccount("all");
	}, [selectAccount]);

	return (
		<div className={styles.layout}>
			<div className={styles.main}>
				<Group className={styles.bar} justify="space-between" px="sm" py={4}>
					<Group gap={6} wrap="wrap">
						<Badge variant="light">{statement.kind.toUpperCase()}</Badge>
						{statement.institution ? (
							<Badge color="gray">{statement.institution}</Badge>
						) : null}
						{currency ? <Badge color="gray">{currency}</Badge> : null}
						<Badge color="gray">
							{transactions.length}{" "}
							{transactions.length === 1 ? "transaction" : "transactions"}
						</Badge>
					</Group>
					<Text size="xs" c={amountColor(String(total))} fw={600} px="xs">
						{formatAmount(String(total))}
					</Text>
				</Group>
				<Divider />
				<ScrollArea className={styles.scroll} scrollbars="y">
					<Table horizontalSpacing="sm" verticalSpacing={6}>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Date</Table.Th>
								<Table.Th>Payee</Table.Th>
								<Table.Th>Category</Table.Th>
								<Table.Th>Type</Table.Th>
								<Table.Th ta="right">Amount</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{transactions.length === 0 ? (
								<Table.Tr>
									<Table.Td colSpan={5}>
										<Text size="sm" c="dimmed">
											No transactions in this statement
										</Text>
									</Table.Td>
								</Table.Tr>
							) : (
								transactions.map((transaction) => (
									<TransactionRow
										key={transaction.id}
										transaction={transaction}
									/>
								))
							)}
						</Table.Tbody>
					</Table>
				</ScrollArea>
			</div>
			<aside className={styles.side}>
				<Group className={styles.bar}>
					<Text size="sm" px="sm">
						Accounts
					</Text>
				</Group>
				<Divider />
				<ScrollArea className={styles.scroll} scrollbars="y">
					<Stack gap="sm" p="sm">
						{statement.accounts.length > 1 ? (
							<Button
								size="compact-xs"
								variant={accountId === "all" ? "light" : "default"}
								onClick={showAllAccounts}
							>
								All accounts
							</Button>
						) : null}
						{statement.accounts.length === 0 ? (
							<Text size="sm" c="dimmed">
								No account details in this file
							</Text>
						) : (
							statement.accounts.map((account) => (
								<AccountSection
									key={account.id}
									account={account}
									selected={accountId === account.id}
									choose={statement.accounts.length > 1}
									onSelect={selectAccount}
								/>
							))
						)}
					</Stack>
				</ScrollArea>
			</aside>
		</div>
	);
}
