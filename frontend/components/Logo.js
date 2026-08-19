import Image from "next/image";
import logoImage from "@/app/icon.jpeg";

// Single source of truth for the Explore N Bite logo image — reused for the
// header/navbar and, via app/icon.jpeg, the browser favicon. Don't reference
// the image path anywhere else; import this component instead.
export default function Logo({ style, priority = false, ...props }) {
  return (
    <Image
      src={logoImage}
      alt="Explore N Bite"
      priority={priority}
      style={{ height: "48px", width: "auto", ...style }}
      {...props}
    />
  );
}
