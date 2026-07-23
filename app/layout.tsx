import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottom } from '@/components/MobileBottom';
import { CartDrawer } from '@/components/CartDrawer';
import { AuthModal } from '@/components/AuthModal';
import { Toaster } from '@/components/Toaster';
import { AssistantProvider } from '@/components/assistant/AssistantProvider';

export const metadata: Metadata = {
  title: 'Northwind — Demo Storefront',
  description: 'A modern responsive eCommerce storefront demo host for Dioschub.',
};

// Render at request time so the assistant's runtime env config (read below) is
// picked up per deployment instead of being baked empty at `next build`.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the assistant's public config at request time (server component) so one
  // built image is configurable per deployment via runtime env. Non-NEXT_PUBLIC
  // names are required — NEXT_PUBLIC_* are inlined at build time. Fall back to
  // the build-time names for a plain local `npm run dev`.
  const assistant = {
    backendUrl: process.env.DIOSC_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_DIOSC_BACKEND_URL || '',
    apiKey: process.env.DIOSC_EMBED_API_KEY || process.env.NEXT_PUBLIC_DIOSC_API_KEY || '',
    assistantId: process.env.DIOSC_PUBLIC_ASSISTANT_ID || process.env.NEXT_PUBLIC_DIOSC_ASSISTANT_ID || '',
  };
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
          <AssistantProvider {...assistant} />
        </StoreProvider>
      </body>
    </html>
  );
}
