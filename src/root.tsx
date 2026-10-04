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
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type React from "react";
import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { useNavigation } from "react-router";
import { makeStore, type ReduxStore } from "@/lib/redux/store";
import { CONTENT_SECURITY_POLICY } from "@/lib/seo";
import { SkipLink } from "@/lib/ui/SkipLink";

import type { Route } from "./+types/root";

dayjs.extend(customParseFormat);

const theme = createTheme({
	defaultRadius: 0,
});

// biome-ignore lint/style/useComponentExportOnlyModules: React Router convention
export const links: Route.LinksFunction = () => [
	{ rel: "icon", href: "/favicon.ico", sizes: "any" },
	{
		rel: "icon",
		href: "/favicon-32x32.png",
		type: "image/png",
		sizes: "32x32",
	},
	{
		rel: "icon",
		href: "/favicon-16x16.png",
		type: "image/png",
		sizes: "16x16",
	},
	{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
	{ rel: "manifest", href: "/site.webmanifest" },
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" data-mantine-color-scheme="light">
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover"
				/>
				<meta name="application-name" content="dysumi" />
				<meta name="theme-color" content="#228be6" />
				<meta name="color-scheme" content="light dark" />
				<meta name="referrer" content="no-referrer" />
				{import.meta.env.PROD ? (
					<meta
						httpEquiv="Content-Security-Policy"
						content={CONTENT_SECURITY_POLICY}
					/>
				) : null}
				<ColorSchemeScript />
				<Meta />
				<Links />
			</head>
			<body>
				<SkipLink />
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Something went wrong";
	let details = "Go back home and try again.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "Page not found" : "Something went wrong";
		details =
			error.status === 404
				? "That page does not exist. Go back home and try again."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: skip-link target is the single main landmark
		<main
			id="main"
			tabIndex={-1}
			style={{ padding: "4rem 1rem", maxWidth: 720 }}
		>
			<h1>{message}</h1>
			<p role="alert">{details}</p>
			{stack ? (
				<pre>
					<code>{stack}</code>
				</pre>
			) : null}
			<p>
				<a href="/">Go back home</a>
			</p>
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
				<Outlet />
			</Provider>
		</MantineProvider>
	);
}
