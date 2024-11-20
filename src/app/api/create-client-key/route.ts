import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cors, handleOptions } from "@/lib/cors";
import crypto from "crypto";

export async function OPTIONS(request: NextRequest) {
	return handleOptions(request);
}

export async function POST(request: NextRequest) {
	try {
		const { domain, secretKey } = await request.json();

		const client = await prisma.apiClient.findUnique({
			where: { secretKey },
		});

		if (!client) {
			return cors(
				request,
				NextResponse.json({ error: "Invalid API key" }, { status: 401 })
			);
		}

		if (!client.domains.includes(domain)) {
			return cors(
				request,
				NextResponse.json({ error: "Domain not authorized" }, { status: 403 })
			);
		}

		const clientKey = crypto.randomBytes(32).toString("hex");

		await prisma.clientKey.create({
			data: {
				key: clientKey,
				domain,
				expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
				apiClientId: client.id,
			},
		});

		return cors(request, NextResponse.json({ clientKey }));
	} catch (error) {
		console.error("Error creating client key:", error);
		return cors(
			request,
			NextResponse.json(
				{ error: "Failed to create client key" },
				{ status: 500 }
			)
		);
	}
}
