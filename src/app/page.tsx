"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
	const [domain, setDomain] = useState("");
	const [name, setName] = useState("");
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setApiKey(null);

		try {
			const response = await fetch("/api/register-client", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ domain, name }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to register");
			}

			setApiKey(data.secretKey);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-center">Register Your Domain</CardTitle>
					<CardDescription className="text-center">
						Get an API key to integrate passkey authentication
					</CardDescription>
				</CardHeader>

				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Organization Name</Label>
							<Input
								id="name"
								type="text"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Your Organization"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="domain">Domain</Label>
							<Input
								id="domain"
								type="text"
								required
								value={domain}
								onChange={(e) => setDomain(e.target.value)}
								placeholder="example.com"
							/>
						</div>
					</CardContent>

					<CardFooter>
						<Button type="submit" className="w-full">
							Register Domain
						</Button>
					</CardFooter>
				</form>

				{error && (
					<CardContent>
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{error}
						</div>
					</CardContent>
				)}

				{apiKey && (
					<CardContent>
						<div className="p-4 bg-muted rounded-md space-y-2">
							<p className="font-medium">
								Your API Key (save this somewhere safe):
							</p>
							<code className="block p-2 bg-background border rounded text-sm break-all">
								{apiKey}
							</code>
							<p className="text-xs text-muted-foreground">
								Use this key with our PasskeyElement component to enable passkey
								authentication on your site.
							</p>
						</div>
					</CardContent>
				)}
			</Card>
		</div>
	);
}
