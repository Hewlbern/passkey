import { prisma } from "@/lib/prisma";
import { isValidApiKey } from "@/lib/api-utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const { domain, apiKey } = await request.json();

		// Verify the API key
		const isValid = await isValidApiKey(apiKey);
		if (!isValid) {
			return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
		}

		// Basic domain validation
		if (!domain.match(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/)) {
			return NextResponse.json(
				{ error: "Invalid domain format" },
				{ status: 400 }
			);
		}

		// Store the domain
		const registration = await prisma.allowedDomain.create({
			data: {
				domain,
				active: true,
			},
		});

		return NextResponse.json({ success: true, registration });
	} catch (error) {
		console.error("Error registering domain:", error);
		return NextResponse.json(
			{ error: "Failed to register domain" },
			{ status: 500 }
		);
	}
}
