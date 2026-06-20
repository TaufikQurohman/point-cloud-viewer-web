import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Universal Point Cloud Viewer',
  description:
    'Upload, convert, and visualize point cloud datasets (E57, PLY, PTS, XYZ, LAS, LAZ) using PDAL, PotreeConverter, and Potree Viewer.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-grid-fine">
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
