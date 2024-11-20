import { Provider } from '../types';

export function createPasskeyProvider(sendRequest: (method: string, params?: any[]) => Promise<any>): Provider {
  return {
    isConnected: async () => {
      return sendRequest('isConnected');
    },
    request: async ({ method, params }) => {
      if (method === 'registerDomain') {
        const { domain, name } = params;
        const response = await fetch('/api/register-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, name }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to register');
        }

        return { secretKey: data.secretKey };
      }

      return sendRequest(method, params);
    },
    on: (event, listener) => {
      // Implement event listener logic if needed
    },
    removeListener: (event, listener) => {
      // Implement remove listener logic if needed
    },
  };
}
