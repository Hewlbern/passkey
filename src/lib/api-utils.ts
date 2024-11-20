import { prisma } from "./prisma";

export async function isValidApiKey(apiKey: string): Promise<boolean> {
	if (!apiKey) return false;

	try {
		const client = await prisma.apiClient.findUnique({
			where: { secretKey: apiKey },
		});

		return !!client; // Returns true if client exists, false otherwise
	} catch (error) {
		console.error("Error validating API key:", error);
		return false;
	}
}
