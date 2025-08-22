"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const ThemedImage = ({
  lightSrc,
  darkSrc,
  alt,
  ...props
}: { lightSrc: string; darkSrc: string; alt: string } & Omit<
  React.ComponentProps<typeof Image>,
  "src"
>) => {
  // 1. Start with a null theme and a not-mounted state.
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // 2. This effect runs *only on the client* after the component mounts.
    const storedTheme = localStorage.getItem("theme");

    // 3. We read the theme from localStorage and update our state.
    if (storedTheme === "dark") {
      setTheme("dark");
    } else {
      // Default to light if it's "light", null, or any other value.
      setTheme("light");
    }
  }, []); // The empty array ensures this runs only once on mount.

  // 4. While the theme is null (on server or before useEffect runs),
  //    we render nothing. This PREVENTS the hydration mismatch.
  if (theme === null) {
    return null;
  }

  // 5. Once the theme is determined, we programmatically choose the correct
  //    image source and render only ONE Image component.
  const src = theme === "dark" ? darkSrc : lightSrc;

  return <Image src={src} alt={alt} {...props} />;
};

export default ThemedImage;
