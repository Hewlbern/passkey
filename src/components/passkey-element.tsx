"use client";

import { useEffect, useState, useRef } from "react";

interface PasskeyElementProps {
	secretKey: string;
	onSuccess?: (userId: string) => void;
	onError?: (error: Error) => void;
}

export function PasskeyElement({
	secretKey,
	onSuccess,
	onError,
}: PasskeyElementProps) {
	const [clientKey, setClientKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		const initializeElement = async () => {
			try {
				// Get the client key
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_AUTH_APP_URL}/api/create-client-key`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							domain: window.location.hostname,
							secretKey,
						}),
					}
				);

				const data = await response.json();
				if (data.error) throw new Error(data.error);

				setClientKey(data.clientKey);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to initialize");
				onError?.(
					err instanceof Error ? err : new Error("Failed to initialize")
				);
			}
		};

		initializeElement();
	}, [secretKey, onError]);

	// Send origin to iframe after it loads
	useEffect(() => {
		if (iframeRef.current && clientKey) {
			const iframe = iframeRef.current;

			const sendOrigin = () => {
				iframe.contentWindow?.postMessage(
					{
						type: "PASSKEY_INIT",
						origin: window.location.origin,
					},
					process.env.NEXT_PUBLIC_AUTH_APP_URL || "*"
				);
			};

			// Send origin both on load and after a short delay to ensure iframe is ready
			iframe.addEventListener("load", sendOrigin);

			// Backup timeout in case load event already fired
			const timeoutId = setTimeout(sendOrigin, 1000);

			return () => {
				iframe.removeEventListener("load", sendOrigin);
				clearTimeout(timeoutId);
			};
		}
	}, [iframeRef.current, clientKey]);

	// Listen for messages from the iframe
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			// Verify the origin of the message
			if (event.origin !== process.env.NEXT_PUBLIC_AUTH_APP_URL) {
				console.log("event.origin", event.origin);
				console.log(
					"process.env.NEXT_PUBLIC_AUTH_APP_URL",
					process.env.NEXT_PUBLIC_AUTH_APP_URL
				);
				console.log("Origin mismatch");
				return;
			}

			if (event.data.type === "PASSKEY_AUTH_SUCCESS") {
				onSuccess?.(event.data.userId);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [onSuccess]);

	if (error) {
		return <div>Error: {error}</div>;
	}

	if (!clientKey) {
		return <div>Loading...</div>;
	}

	return (
		<iframe
			ref={iframeRef}
			src={`${process.env.NEXT_PUBLIC_AUTH_APP_URL}/auth?key=${clientKey}`}
			width="400"
			height="600"
			style={{ border: "none" }}
			allow="publickey-credentials-create *; publickey-credentials-get *"
		/>
	);
}
