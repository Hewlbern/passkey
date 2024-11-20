import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
	try {
		const { domain, name } = await request.json();

		// Basic validation
		if (!domain || !name) {
			return NextResponse.json(
				{ error: "Domain and name are required" },
				{ status: 400 }
			);
		}

		// Validate domain format
		if (
			!domain.match(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/) &&
			!domain.includes("localhost")
		) {
			return NextResponse.json(
				{ error: "Invalid domain format" },
				{ status: 400 }
			);
		}

		// Generate a secret key
		const secretKey = `pk_${crypto.randomBytes(32).toString("hex")}`;

		// Create the API client
		const client = await prisma.apiClient.create({
			data: {
				name,
				secretKey,
				domains: [domain],
			},
		});

		// Also create an allowed domain entry
		await prisma.allowedDomain.create({
			data: {
				domain,
				active: true,
			},
		});

		return NextResponse.json({
			success: true,
			secretKey: client.secretKey,
			message: "Domain registered successfully",
		});
	} catch (error) {
		console.error("Error registering client:", error);
		return NextResponse.json(
			{ error: "Failed to register domain" },
			{ status: 500 }
		);
	}
}
