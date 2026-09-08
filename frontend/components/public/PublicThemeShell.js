import { Playfair_Display, Open_Sans } from "next/font/google";
import themeStyles from "@/app/(site)/theme.module.css";

// The public site's theme context (Playfair Display + Open Sans font
// variables, and the `.themeRoot` design tokens every public component reads
// via var(--enb-*) / var(--font-*)) without the public Header/Footer chrome.
//
// app/(site)/layout.js applies the same fonts + `.themeRoot` to every public
// route; this component exists so the admin post-preview route
// (app/admin/preview), which lives OUTSIDE the (site) route group, can render
// public presentation components (ProseContent, the single-post CSS module,
// Sidebar widgets) with identical styling.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
});

export default function PublicThemeShell({ children }) {
  return (
    <div className={`${playfairDisplay.variable} ${openSans.variable} ${themeStyles.themeRoot}`}>
      {children}
    </div>
  );
}
