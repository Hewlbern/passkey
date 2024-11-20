export async function headers() {
	return {
		"Permissions-Policy":
			"publickey-credentials-create=*, publickey-credentials-get=*",
	};
}
