// src/app/page.tsx
import { FileUploadArea } from '@/components/custom/FileUploadArea';

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8 flex flex-col items-center">
      <FileUploadArea />
    </main>
  );
}
