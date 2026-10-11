import type { AppProps } from "next/app";
import { Geist } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${geistSans.variable} font-sans antialiased`}>
      <Component {...pageProps} />
    </div>
  );
}
