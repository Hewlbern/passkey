import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { createWallet as createWalletImpl } from './wallet/wallet';
import { WalletOptions, Wallet } from './types';
import WalletWidget from './WalletWidget';
import { VersionInfo } from './VersionInfo';

const WalletContext = createContext<Wallet | undefined>(undefined);

export function createWallet(options: WalletOptions): Wallet {
  return createWalletImpl(options);
}

type WalletProviderProps = {
  children: ReactNode;
  wallet: Wallet;
};

export function WalletProvider({ children, wallet }: WalletProviderProps) {
  return (
    <WalletContext.Provider value={wallet}>
      <VersionInfo />
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): Wallet {
  const wallet = useContext(WalletContext);
  if (!wallet) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return wallet;
}

export function useRegisterDomain() {
  const wallet = useWallet();
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setApiKey(null);

    try {
      const response = await wallet.providers.passkey.request({
        method: 'registerDomain',
        params: { domain, name }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setApiKey(response.secretKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return {
    domain,
    setDomain,
    name,
    setName,
    apiKey,
    error,
    handleSubmit
  };
}

export { WalletWidget };
export * from './types';
