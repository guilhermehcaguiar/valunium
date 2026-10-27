import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '../components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Valunium | Acompanhamento patrimonial',
  description: 'Fundação open source para acompanhar e compreender seu patrimônio. Exclusivamente informativo.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body><AppShell>{children}</AppShell></body></html>;
}
