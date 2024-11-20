export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

let isCredentialOperationInProgress = false;

export const checkPasskeySupport = () => {
	return (
		window.PublicKeyCredential &&
		typeof window.PublicKeyCredential === "function"
	);
};

export const hasPasskeys = async () => {
	if (!checkPasskeySupport()) return false;

	try {
		// Check if conditional UI is available
		const available =
			await PublicKeyCredential.isConditionalMediationAvailable();

		// Check if the authenticator is available
		const platformAuthenticator =
			await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

		// Only check if the device supports passkeys
		return available && platformAuthenticator;
	} catch (error) {
		console.error("Error checking for passkeys:", error);
		return false;
	}
};

export const acquireCredentialLock = async () => {
	if (isCredentialOperationInProgress) {
		throw new Error("A credential operation is already in progress");
	}
	isCredentialOperationInProgress = true;
};

export const releaseCredentialLock = () => {
	isCredentialOperationInProgress = false;
};
