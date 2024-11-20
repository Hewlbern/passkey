import { isAllowedDomain } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const domain = searchParams.get("domain");

	if (!domain) {
		return NextResponse.json({ allowed: false });
	}

	const isAllowed = await isAllowedDomain(domain);
	return NextResponse.json({ allowed: isAllowed });
}
