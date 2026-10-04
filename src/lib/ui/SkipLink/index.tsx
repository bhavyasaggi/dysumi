import styles from "./styles.module.scss";

export function SkipLink() {
	return (
		<a className={styles.skip} href="#main">
			Skip to content
		</a>
	);
}
