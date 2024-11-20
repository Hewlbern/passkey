import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/prisma";

export const redis = Redis.fromEnv();

const ALLOWED_DOMAINS_CACHE_KEY = "allowed-domains";
const CACHE_TTL = 60 * 5; // 5 minutes

export async function isAllowedDomain(domain: string): Promise<boolean> {
	try {
		// Try cache first
		const cachedDomains = await redis.get<string[]>(ALLOWED_DOMAINS_CACHE_KEY);

		if (cachedDomains) {
			return cachedDomains.includes(domain);
		}

		// If not in cache, query database
		const domains = await prisma.allowedDomain.findMany({
			where: { active: true },
			select: { domain: true },
		});

		const domainList = domains.map((d) => d.domain);

		// Update cache
		await redis.set(ALLOWED_DOMAINS_CACHE_KEY, domainList, {
			ex: CACHE_TTL,
		});

		return domainList.includes(domain);
	} catch (error) {
		console.error("Error checking domain:", error);
		return false;
	}
}
