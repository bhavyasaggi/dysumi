import React, { useSyncExternalStore } from "react";

function subscribeClean() {
	/* no-op */
}
function subscribe() {
	return subscribeClean;
}
function getSnapshot() {
	return true;
}
function getServerSnapshot() {
	return false;
}

// biome-ignore lint/style/useComponentExportOnlyModules: internal helper component
function ReadyBoundary(props: { render: (ready: boolean) => React.ReactNode }) {
	const clientReady = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);

	return props.render(clientReady);
}

// biome-ignore lint/suspicious/noExplicitAny: Picked from React.Lazy type-declarations
export function clientBoundary<T extends React.ComponentType<any>>(
	load: () => Promise<{ default: T }>,
	options?: {
		loading?: (error?: Error, retry?: () => void) => React.ReactNode;
	},
) {
	const LazyComponent = React.lazy(load);

	return class ClientBoundary extends React.Component<
		React.ComponentProps<T>,
		{ hasError: Error | undefined }
	> {
		constructor(props: React.ComponentProps<T>) {
			super(props);
			this.state = { hasError: undefined };
		}

		static getDerivedStateFromError(error: Error) {
			return { hasError: error };
		}

		resetError = () => {
			this.setState({ hasError: undefined });
		};

		renderReady = (ready: boolean) => {
			return ready ? (
				<LazyComponent {...(this.props as React.ComponentProps<T>)} />
			) : (
				(options?.loading?.() ?? null)
			);
		};

		render() {
			if (this.state.hasError) {
				return options?.loading?.(this.state.hasError, this.resetError) ?? null;
			}

			return (
				<React.Suspense fallback={options?.loading?.() ?? null}>
					<ReadyBoundary render={this.renderReady} />
				</React.Suspense>
			);
		}
	};
}
