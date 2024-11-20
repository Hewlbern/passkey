"use client";

import { useState, useEffect } from "react";
import {
	acquireCredentialLock,
	arrayBufferToBase64,
	base64ToArrayBuffer,
	checkPasskeySupport,
	hasPasskeys,
	releaseCredentialLock,
} from "../../utils/webauthn";
import {
	checkForRegisteredPasskeys,
	startRegistration,
	completeRegistration,
	startAuthentication,
	completeAuthentication,
} from "../actions/auth";

export default function AuthPage() {
	useEffect(() => {
		console.log("AuthPage: Component mounted", {
			url: document.location.href,
			search: document.location.search,
			key: new URLSearchParams(document.location.search).get("key"),
			environment: process.env.NODE_ENV,
			runtime: typeof window !== 'undefined' ? 'client' : 'server'
		});
	}, []);

	const [status, setStatus] = useState("");
	const [hasExistingPasskey, setHasExistingPasskey] = useState<boolean | null>(
		null
	);
	const [isSupported, setIsSupported] = useState(false);
	const [isChecking, setIsChecking] = useState(true);
	const [isValidKey, setIsValidKey] = useState(false);
	const [verifiedOrigin, setVerifiedOrigin] = useState<string | null>(null);
	const [isInitializing, setIsInitializing] = useState(true);

	// Define notifyParentOfSuccess before using it
	const notifyParentOfSuccess = (userId: string) => {
		if (verifiedOrigin) {
			window.parent.postMessage(
				{
					type: "PASSKEY_AUTH_SUCCESS",
					userId,
				},
				verifiedOrigin
			);
		}
	};

	useEffect(() => {
		console.log("Current origin:", window.location.origin);
		console.log("Document cookie access:", document.cookie);
	}, []);

	useEffect(() => {
		console.log("AuthPage: Message listener setup", {
			origin: window.location.origin,
			isIframe: window !== window.top,
			parentOrigin: window.parent.origin
		});

		const handleMessage = async (event: MessageEvent) => {
			console.log("AuthPage: Received message", {
				type: event.data.type,
				origin: event.origin,
				data: event.data
			});

			if (event.data.type === "PASSKEY_INIT") {
				const { origin } = event.data;
				const params = new URLSearchParams(window.location.search);
				const key = params.get("key");

				console.log("AuthPage: Processing PASSKEY_INIT", {
					receivedOrigin: origin,
					key,
					currentOrigin: window.location.origin
				});

				if (!key) {
					console.warn("AuthPage: No key provided in URL");
					setIsInitializing(false);
					return;
				}

				try {
					console.log("AuthPage: Verifying client key", {
						key,
						parentDomain: new URL(origin).hostname
					});

					const response = await fetch("/api/verify-client-key", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							key,
							parentDomain: new URL(origin).hostname,
						}),
					});

					const data = await response.json();
					console.log("AuthPage: Key verification response", {
						valid: data.valid,
						origin
					});

					setIsValidKey(data.valid);
					if (data.valid) {
						setVerifiedOrigin(origin);
					}
				} catch (error) {
					console.error("AuthPage: Failed to verify client key:", error);
				} finally {
					setIsInitializing(false);
				}
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	useEffect(() => {
		const checkSupport = async () => {
			console.log("Checking support");
			setIsChecking(true);
			try {
				// First check browser support - this doesn't require network
				const supported = checkPasskeySupport();
				setIsSupported(supported);

				if (!supported) {
					console.log("Browser does not support passkeys");
					setHasExistingPasskey(false);
					return;
				}

				// Then check if the device supports passkeys
				const deviceSupported = await hasPasskeys();

				if (!deviceSupported) {
					console.log("Device does not support passkeys");
					setHasExistingPasskey(false);
					return;
				}

				// Finally check for registered passkeys
				console.log("Checking for registered passkeys from checkSupport");
				const hasRegistered = await checkForRegisteredPasskeys();
				console.log("hasRegistered", hasRegistered);
				setHasExistingPasskey(hasRegistered);
				setIsChecking(false);
			} finally {
				setIsChecking(false);
			}
		};
		console.log("Checking support");
		checkSupport();
	}, []);

	const createPasskey = async () => {
		try {
			await acquireCredentialLock();
			setStatus("Creating passkey...");

			// Get registration options from server
			const options = await startRegistration();
			console.log("Registration options received:", options);

			// Convert challenge from base64 to ArrayBuffer
			const challenge = base64ToArrayBuffer(options.challenge);

			const createCredentialOptions: PublicKeyCredentialCreationOptions = {
				...options,
				challenge,
				attestation: "direct" as AttestationConveyancePreference,
				pubKeyCredParams: [
					{
						alg: -7,
						type: "public-key" as const,
					},
				],
				user: {
					...options.user,
					id: Uint8Array.from(options.user.id, (c) => c.charCodeAt(0)),
				},
				authenticatorSelection: {
					...options.authenticatorSelection,
					authenticatorAttachment: options.authenticatorSelection
						.authenticatorAttachment as AuthenticatorAttachment,
					residentKey: options.authenticatorSelection
						.residentKey as ResidentKeyRequirement,
					userVerification: options.authenticatorSelection
						.userVerification as UserVerificationRequirement,
				},
			};

			console.log("Requesting credential creation...");
			const credential = (await navigator.credentials.create({
				publicKey: createCredentialOptions,
			})) as PublicKeyCredential;

			if (credential) {
				console.log("Credential created:", {
					id: credential.id,
					type: credential.type,
				});

				// Complete registration with server
				const registrationData = {
					id: credential.id,
					rawId: arrayBufferToBase64(credential.rawId),
					response: {
						publicKey: arrayBufferToBase64(
							(
								credential.response as AuthenticatorAttestationResponse
							).getPublicKey() as ArrayBuffer
						),
						counter: 0,
						transports:
							(
								credential.response as AuthenticatorAttestationResponse
							).getTransports?.() || [],
					},
					type: credential.type,
				};

				console.log("Sending registration data:", {
					id: registrationData.id,
					rawIdLength: registrationData.rawId.length,
					publicKeyLength: registrationData.response.publicKey.length,
				});

				const result = await completeRegistration(registrationData);

				if (result.success) {
					console.log("Registration completed successfully:", result);
					setStatus("Passkey created successfully!");
					// Use the returned userId instead of the hardcoded one
					const hasRegistered = await checkForRegisteredPasskeys(result.userId);
					setHasExistingPasskey(hasRegistered);
				}
			}
		} catch (error) {
			console.error("Error creating passkey:", error);
			setStatus(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		} finally {
			releaseCredentialLock();
		}
	};

	const initiateAuth = async () => {
		try {
			await acquireCredentialLock();
			setStatus("Initiating authentication...");

			// First start the authentication process
			const options = await startAuthentication();

			// Convert the base64 challenge back to ArrayBuffer for the credential request
			const challengeBuffer = base64ToArrayBuffer(options.challenge);

			// Create the credential request options
			const credentialRequestOptions: PublicKeyCredentialRequestOptions = {
				challenge: challengeBuffer,
				rpId: options.rpId,
				timeout: options.timeout,
				userVerification:
					options.userVerification as UserVerificationRequirement,
			};

			// Get the credential
			const credential = (await navigator.credentials.get({
				publicKey: credentialRequestOptions,
			})) as PublicKeyCredential;

			// Now complete the authentication
			const result = await completeAuthentication({
				id: credential.id,
				rawId: arrayBufferToBase64(credential.rawId),
				response: {
					authenticatorData: arrayBufferToBase64(
						(credential.response as AuthenticatorAssertionResponse)
							.authenticatorData
					),
					clientDataJSON: arrayBufferToBase64(
						(credential.response as AuthenticatorAssertionResponse)
							.clientDataJSON
					),
					signature: arrayBufferToBase64(
						(credential.response as AuthenticatorAssertionResponse).signature
					),
					userHandle: (credential.response as AuthenticatorAssertionResponse)
						.userHandle
						? arrayBufferToBase64(
								(credential.response as AuthenticatorAssertionResponse)
									.userHandle
						  )
						: null,
				},
				type: credential.type,
			});

			// Handle successful authentication
			if (result.success) {
				setStatus("Authentication successful!");
				notifyParentOfSuccess(result.user.id);
			}
		} catch (error) {
			console.error("Error authenticating:", error);
			setStatus(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		} finally {
			releaseCredentialLock();
		}
	};

	if (isInitializing) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p>Initializing...</p>
				</div>
			</div>
		);
	}

	if (!isValidKey) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center text-red-600">
					<p>Invalid or expired client key.</p>
					<p>Please refresh the page or contact support.</p>
				</div>
			</div>
		);
	}

	if (!isSupported) {
		return (
			<div className="p-6">
				<div className="text-red-600">
					Your browser doesn&apos;t support passkeys. Please use a modern
					browser.
				</div>
			</div>
		);
	}

	if (isChecking) {
		return (
			<div className="p-6">
				<div className="text-gray-600">Checking passkey capabilities...</div>
			</div>
		);
	}

	return (
		<div className="p-6">
			<h2 className="text-xl font-bold mb-4">Passkey Authentication</h2>

			{hasExistingPasskey === null ? (
				<div className="mb-4">Checking for existing passkeys...</div>
			) : hasExistingPasskey ? (
				<>
					<div className="mb-4 text-green-600">
						You have a passkey set up. You can use it to sign in.
					</div>
					<button
						onClick={initiateAuth}
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
					>
						Sign in with Passkey
					</button>
				</>
			) : (
				<>
					<div className="mb-4 text-amber-600">
						You don&apos;t have a passkey yet. Create one to get started.
					</div>
					<button
						onClick={createPasskey}
						className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
					>
						Create Passkey
					</button>
				</>
			)}

			{status && (
				<div className="mt-4 p-4 border rounded bg-gray-50">{status}</div>
			)}
		</div>
	);
}
