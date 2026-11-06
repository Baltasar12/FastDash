"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navigation } from "@/config/navigation";

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          className="mobile-menu-trigger icon-button"
          aria-label="Open navigation"
        >
          <Menu size={24} aria-hidden="true" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="nav-overlay" />
          <Dialog.Content
            className="mobile-nav-panel"
            aria-describedby="navigation-description"
          >
            <div className="mobile-nav-heading">
              <Dialog.Title>Explore SECTOR</Dialog.Title>
              <Dialog.Close
                className="icon-button"
                aria-label="Close navigation"
              >
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <Dialog.Description
              id="navigation-description"
              className="mobile-nav-description"
            >
              Independent motorsport intelligence.
            </Dialog.Description>
            <nav aria-label="Mobile navigation">
              {navigation.map(({ href, label }, index) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === href ? "page" : undefined}
                >
                  <span className="eyebrow">0{index}</span>
                  {label}
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <p className="eyebrow mobile-nav-note">
              A DIFFERENT VIEW OF THE RACE.
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
