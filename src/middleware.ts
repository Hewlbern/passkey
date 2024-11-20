import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
	const response = NextResponse.next();

	// Get the parent domain from the referer header
	const referer = request.headers.get("referer");
	let frameAncestors = ["'self'"];
	let isDirectVisit = !referer;

	if (!isDirectVisit) {
		try {
			const parentDomain = new URL(referer).hostname;

			console.log("Checking domain:", parentDomain);
			// Call our internal API to check the domain
			const checkResult = await fetch(
				`${request.nextUrl.origin}/api/check-domain?domain=${encodeURIComponent(
					parentDomain
				)}`
			).then((res) => res.json());

			console.log("Check result:", checkResult);

			if (checkResult.allowed) {
				// Add the full origin to frame-ancestors
				frameAncestors.push(new URL(referer).origin);
			}
		} catch (error) {
			console.error("Error checking domain:", error);
		}
	}

	// Set comprehensive security headers
	response.headers.set(
		"Content-Security-Policy",
		[
			`frame-ancestors ${frameAncestors.join(" ")};`,
			"default-src 'self';",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval';",
			"style-src 'self' 'unsafe-inline';",
			"img-src 'self' data: https:;",
			"connect-src 'self' https:;",
			"font-src 'self';",
			"object-src 'none';",
			"base-uri 'self';",
			"form-action 'self';",
			"frame-src 'self' https:;",
		].join(" ")
	);

	// Set other security headers
	response.headers.set(
		"Permissions-Policy",
		"publickey-credentials-create=*, publickey-credentials-get=*"
	);

	response.headers.set(
		"Strict-Transport-Security",
		"max-age=31536000; includeSubDomains"
	);

	response.headers.set("X-Content-Type-Options", "nosniff");

	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

	// Remove X-Frame-Options only if it's a page that needs to be embedded
	if (request.nextUrl.pathname === "/auth") {
		response.headers.delete("X-Frame-Options");
	} else {
		response.headers.set("X-Frame-Options", "SAMEORIGIN");
	}

	return response;
}

// Update matcher to exclude api routes since middleware is async now
export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
