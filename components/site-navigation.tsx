"use client";

import {
  CalendarDots,
  House,
  Trophy,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = [
  { href: "/", label: "Home", icon: House },
  { href: "/groups", label: "Groups", icon: UsersThree },
  { href: "/matches", label: "Matches", icon: CalendarDots },
  { href: "/bracket", label: "Bracket", icon: Trophy },
] as const;

type SiteNavigationProps = {
  variant: "desktop" | "mobile";
};

export function SiteNavigation({ variant }: SiteNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={`site-navigation site-navigation--${variant}`}
      aria-label="Primary"
    >
      <ul>
        {routes.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/" && pathname.startsWith(`${href}/`));

          return (
            <li key={href}>
              <Link
                href={href}
                className="site-navigation__link focus-inverse"
                aria-current={isActive ? "page" : undefined}
              >
                <span className="site-navigation__marker" aria-hidden="true" />
                <Icon
                  className="site-navigation__icon"
                  size={22}
                  weight="regular"
                  aria-hidden="true"
                />
                <span className="site-navigation__label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
