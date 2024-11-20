import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cors } from "@/lib/cors";

export async function POST(request: NextRequest) {
	try {
		const { key, parentDomain } = await request.json();

		if (!parentDomain) {
			return cors(
				request,
				NextResponse.json({ valid: false, error: "No parent domain provided" })
			);
		}

		const clientKey = await prisma.clientKey.findUnique({
			where: { key },
			include: { apiClient: true },
		});

		if (!clientKey) {
			return cors(
				request,
				NextResponse.json({ valid: false, error: "Invalid key" })
			);
		}

		if (clientKey.expiresAt < new Date()) {
			return cors(
				request,
				NextResponse.json({ valid: false, error: "Expired key" })
			);
		}

		if (parentDomain !== clientKey.domain) {
			return cors(
				request,
				NextResponse.json({ valid: false, error: "Domain mismatch" })
			);
		}

		if (!clientKey.apiClient.domains.includes(parentDomain)) {
			return cors(
				request,
				NextResponse.json({ valid: false, error: "Domain not allowed" })
			);
		}

		return cors(request, NextResponse.json({ valid: true }));
	} catch (error) {
		console.error("Error verifying client key:", error);
		return cors(
			request,
			NextResponse.json({ valid: false, error: "Verification failed" })
		);
	}
}

export async function OPTIONS(request: NextRequest) {
	return cors(request, new NextResponse(null, { status: 200 }));
}
