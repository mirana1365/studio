// src/components/custom/Navbar.tsx
import Link from "next/link";
import { ThemeSwitcher } from "./ThemeSwitcher";

const FileForgeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-primary">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <path d="M12 18v-1a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1"></path>
    <path d="M12 12L8 12"></path>
  </svg>
);


export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2.5 mr-auto">
          <FileForgeIcon />
          <span className="font-bold text-xl sm:text-2xl tracking-tight">
            فایل‌فورج
          </span>
        </Link>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
