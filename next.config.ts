/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.next_public_firebase_api_key,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.next_public_firebase_auth_domain,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.next_public_firebase_database_url,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.next_public_firebase_project_id,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.next_public_firebase_storage_bucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.next_public_firebase_messaging_sender_id,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.next_public_firebase_app_id,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.next_public_firebase_measurement_id,
  },
};

module.exports = nextConfig;
