import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Remove static metadata export and combine it with generateMetadata
export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "Hiero Authentication Provider for Passkeys",
		description: "Hiero Authentication provider offering secure passkey solutions.",
		
		alternates: {
			canonical: "/",
		},
	};
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>{children}</body>
		</html>
	);
}
