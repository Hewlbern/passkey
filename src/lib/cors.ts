import { NextRequest, NextResponse } from "next/server";
import { isAllowedDomain } from "./redis";

export async function cors(request: NextRequest, response: NextResponse) {
	const origin = request.headers.get("origin");

	if (!origin) {
		return response;
	}

	try {
		const domain = new URL(origin).hostname;
		const isAllowed = await isAllowedDomain(domain);

		if (!isAllowed) {
			return response;
		}

		// Set CORS headers for allowed domains
		response.headers.set("Access-Control-Allow-Origin", origin);
		response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		response.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization"
		);
		response.headers.set("Access-Control-Max-Age", "86400");

		return response;
	} catch (error) {
		console.error("Error in CORS check:", error);
		return response;
	}
}

// Helper function for OPTIONS requests
export async function handleOptions(request: NextRequest) {
	const response = new NextResponse(null, { status: 204 }); // No content
	return cors(request, response);
}
