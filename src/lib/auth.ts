// src/lib/auth.ts
"use server"; // Can be used in server components/actions

// IMPORTANT: In a real application, use a strong hashing algorithm like bcrypt or Argon2.
// For this example, we're doing a direct comparison for simplicity.
// Ensure ADMIN_PASSWORD is set in your .env.local file.
// Example: ADMIN_PASSWORD=yoursecurepassword

export async function verifyPassword(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable is not set.");
    return false; 
  }
  return password === adminPassword;
}
