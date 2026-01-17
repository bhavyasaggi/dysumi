import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import "@mantine/core/styles.css";
import "@mantine/nprogress/styles.css";

import { ColorSchemeScript, createTheme, MantineProvider } from "@mantine/core";
import { NavigationProgress, nprogress } from "@mantine/nprogress";
import type React from "react";
import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { useNavigation } from "react-router";
import DynamicBoundary from "@/components/DynamicBoundary";
import { makeStore, type ReduxStore } from "@/lib/redux/store";

import type { Route } from "./+types/root";

const theme = createTheme({
	defaultRadius: 0,
});

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover"
				/>
				<meta name="application-name" content="dysumi" />
				<meta name="theme-color" content="#228be6" />
				<ColorSchemeScript />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}

function AppProgress() {
	const navigation = useNavigation();
	useEffect(() => {
		if (navigation.state === "idle") {
			nprogress.complete();
		} else {
			nprogress.start();
		}
	}, [navigation.state]);

	return <NavigationProgress />;
}

export default function App() {
	const storeRef = useRef<ReduxStore>(undefined);
	if (!storeRef.current) {
		// Create the store instance the first time this renders
		storeRef.current = makeStore();
	}

	return (
		<MantineProvider theme={theme} defaultColorScheme="light">
			<Provider store={storeRef.current}>
				<AppProgress />
				<DynamicBoundary>
					<Outlet />
				</DynamicBoundary>
			</Provider>
		</MantineProvider>
	);
}
