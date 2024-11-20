"use server";

import { prisma } from "@/lib/prisma";

import { cookies } from "next/headers";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/utils/webauthn";
import crypto from "crypto";
import { headers } from "next/headers";

function getDomain() {
	if (process.env.NODE_ENV === "development") {
		return "localhost";
	}

	// For production and preview deployments
	return process.env.VERCEL_PROJECT_PRODUCTION_URL;
}

export async function checkForRegisteredPasskeys(userId?: string) {
	try {
		console.log("Checking for registered passkeys for userId:", userId);

		// Log all cookies
		const allCookies = cookies().getAll();
		console.log("All cookies in checkForRegisteredPasskeys:", allCookies);

		// If no userId provided, try to get it from the cookie
		const userIdCookie = cookies().get("userId");
		console.log("userId cookie:", userIdCookie);

		const actualUserId = userId || userIdCookie?.value;

		if (!actualUserId) {
			console.log("No userId provided or found in cookie");
			return false;
		}

		const passkeys = await prisma.passkey.findMany({
			where: { userId: actualUserId },
			include: { user: true },
		});

		console.log("Found passkeys:", {
			userId: actualUserId,
			count: passkeys.length,
			passkeys: passkeys.map((p) => ({
				id: p.id,
				credentialId: p.credentialId,
				userEmail: p.user.email,
			})),
		});

		return passkeys.length > 0;
	} catch (error) {
		console.error("Error checking for registered passkeys:", error);
		return false;
	}
}

export async function startRegistration() {
	try {
		const challenge = crypto.getRandomValues(new Uint8Array(32));
		const challengeBase64 = arrayBufferToBase64(challenge);
		const domain = getDomain();

		// Set the cookie with appropriate SameSite settings for iframe usage
		cookies().set("registration_challenge", challengeBase64, {
			httpOnly: true,
			secure: true, // Always use secure in production
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			maxAge: 300, // 5 minutes
			domain: process.env.NODE_ENV === "production" ? domain : undefined,
			path: "/",
		});

		console.log("Cookies after setting:", cookies().getAll());

		const headersList = headers();
		console.log("Request headers:", {
			cookie: headersList.get("cookie"),
			host: headersList.get("host"),
			origin: headersList.get("origin"),
		});

		return {
			challenge: challengeBase64,
			rp: {
				// Use your app's name
				name: "Your App Name",
				// Must match your domain exactly
				id: domain,
			},
			user: {
				id: "temp-user-id",
				name: "user@example.com",
				displayName: "Test User",
			},
			pubKeyCredParams: [{ alg: -7, type: "public-key" }],
			timeout: 60000,
			attestation: "direct",
			authenticatorSelection: {
				authenticatorAttachment: "platform",
				residentKey: "required",
				requireResidentKey: true,
				userVerification: "preferred",
			},
			// Add origin verification
			extensions: {
				credProps: true,
			},
		};
	} catch (error) {
		console.error("Error starting registration:", error);
		throw new Error("Failed to start registration");
	}
}

export async function completeRegistration(credential: RegistrationCredential) {
	try {
		// Get and log all cookies for debugging
		const allCookies = cookies().getAll();

		console.log("All cookies:", allCookies);

		// Get the challenge cookie
		const storedChallenge = cookies().get("registration_challenge");
		console.log("Stored challenge:", storedChallenge);

		if (!storedChallenge?.value) {
			throw new Error("Registration challenge not found");
		}

		// Clear the challenge cookie immediately
		console.log("deleting registration_challenge in completeRegistration");
		cookies().delete({
			name: "registration_challenge",
			path: "/",
		});

		// Log the incoming credential data
		console.log("Received credential for registration:", {
			credentialId: credential.rawId,
			publicKeyLength: credential.response.publicKey.length,
			transports: credential.response.transports,
		});

		// Store the credential in the database
		const passkey = await prisma.passkey.create({
			data: {
				credentialId: credential.rawId,
				publicKey: credential.response.publicKey,
				counter: BigInt(credential.response.counter),
				transports: credential.response.transports,
				user: {
					connectOrCreate: {
						where: { email: "user@example.com" },
						create: {
							email: "user@example.com",
							name: "Test User",
						},
					},
				},
			},
			include: { user: true }, // Include the user data in the response
		});

		// Log the stored passkey
		console.log("Stored passkey:", {
			id: passkey.id,
			credentialId: passkey.credentialId,
			userId: passkey.userId,
		});

		// Store the userId in a cookie for future checks
		cookies().set("userId", passkey.userId, {
			httpOnly: true,
			secure: true,
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			maxAge: 7 * 24 * 60 * 60, // 1 week
			domain: process.env.NODE_ENV === "production" ? getDomain() : undefined,
			path: "/",
		});

		return { success: true, passkey, userId: passkey.userId };
	} catch (error) {
		console.error("Error completing registration:", error);
		throw new Error(
			`Failed to complete registration: ${
				error instanceof Error ? error.message : "Unknown error"
			}`
		);
	}
}

export async function startAuthentication() {
	try {
		const challenge = crypto.getRandomValues(new Uint8Array(32));
		const challengeBase64 = arrayBufferToBase64(challenge);
		const domain = getDomain();

		cookies().set("authentication_challenge", challengeBase64, {
			httpOnly: true,
			secure: true, // Always use secure
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			maxAge: 300,
			domain: process.env.NODE_ENV === "production" ? domain : undefined,
			path: "/",
		});

		// Add debug logging
		console.log("Authentication cookies after setting:", cookies().getAll());

		return {
			challenge: challengeBase64,
			rpId: domain,
			timeout: 60000,
			userVerification: "preferred",
			extensions: {
				credProps: true,
			},
		};
	} catch (error) {
		console.error("Error starting authentication:", error);
		throw new Error("Failed to start authentication");
	}
}

export async function completeAuthentication(
	credential: AuthenticationCredential
) {
	try {
		// Add debug logging
		const allCookies = cookies().getAll();
		console.log("All cookies in completeAuthentication:", allCookies);

		const storedChallenge = cookies().get("authentication_challenge");
		console.log("Stored authentication challenge:", storedChallenge);

		if (!storedChallenge?.value) {
			throw new Error("Authentication challenge not found");
		}

		// Clear the challenge cookie with matching settings
		cookies().delete({ name: "authentication_challenge", path: "/" });

		// Find the passkey in the database
		const passkey = await prisma.passkey.findUnique({
			where: { credentialId: credential.rawId },
			include: { user: true },
		});

		if (!passkey) {
			throw new Error("Passkey not found");
		}

		// Here you would verify the signature using the stored public key
		// and update the counter

		// Update the lastUsed timestamp
		await prisma.passkey.update({
			where: { id: passkey.id },
			data: { lastUsed: new Date() },
		});

		return { success: true, user: passkey.user };
	} catch (error) {
		console.error("Error completing authentication:", error);
		throw new Error("Failed to complete authentication");
	}
}

function getClientInfo() {
	const headersList = headers();
	return {
		userAgent: headersList.get("user-agent"),
		ip: headersList.get("x-forwarded-for") || "unknown",
	};
}

type RegistrationCredential = {
	id: string;
	rawId: string;
	response: {
		publicKey: string;
		counter: number;
		transports: string[];
	};
	type: string;
};

type AuthenticationCredential = {
	id: string;
	rawId: string;
	response: {
		authenticatorData: string;
		clientDataJSON: string;
		signature: string;
		userHandle: string | null;
	};
	type: string;
};
