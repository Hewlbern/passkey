import React, { useEffect, useRef } from 'react';
import { useWallet } from './core';

type WalletWidgetProps = {
  theme?: any;
  size?: 'small' | 'medium' | 'large';
  shape?: 'rounded' | 'square';
  experimental_mode?: 'dropdown' | 'modal';
  noAutoCollapse?: boolean;
  compact?: boolean;
  noAutoCompact?: boolean;
  smallBreakpoint?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function WalletWidget(props: WalletWidgetProps) {
  const wallet = useWallet();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    wallet.setWidgetConfig(props);
  }, [wallet, props]);

  useEffect(() => {
    if (containerRef.current) {
      wallet.renderWidget(containerRef.current);
    }
    return () => {
      wallet.renderWidget(null);
    };
  }, [wallet]);

  return <div ref={containerRef} className={props.className} style={props.style} />;
}
