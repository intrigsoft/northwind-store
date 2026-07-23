import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottom } from '@/components/MobileBottom';
import { CartDrawer } from '@/components/CartDrawer';
import { AuthModal } from '@/components/AuthModal';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'Northwind — Demo Storefront',
  description: 'A modern responsive eCommerce storefront demo host for Dioschub.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreProvider>
          <div id="root">
            <Header />
            <div style={{ flex: 1 }}>{children}</div>
            <Footer />
          </div>
          <MobileBottom />
          <CartDrawer />
          <AuthModal />
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
