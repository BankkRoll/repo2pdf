// /src/components/layout/navbar.tsx

import {
  GitHubLogoIcon,
  HamburgerMenuIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FaNpm } from "react-icons/fa6";
import Link from "next/link";
import { ModeToggle } from "@/components/ui/mode-toggle";
import NumberTicker from "../ui/number-ticker";

interface RouteProps {
  href: string;
  label: string;
}

const routeList: RouteProps[] = [
  {
    href: "create",
    label: "Create",
  },
  {
    href: "/#about",
    label: "About",
  },
  {
    href: "/#faq",
    label: "FAQ",
  },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [stars, setStars] = useState<number>(10);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch("/api/github-stars");

        if (response.ok) {
          const data = await response.json();
          setStars(data.stars);
        } else {
          console.error("Error fetching GitHub stars:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching GitHub stars:", error);
      }
    };

    fetchStars();
  }, []);

  return (
    <header className="overflow-x-hidden sticky border-b-[1px] top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container h-14 px-4 w-screen flex justify-between">
          <NavigationMenuItem className="font-bold flex">
            <Link href="/" className="ml-2 font-bold text-xl flex">
              <h1 className="inline font-bold">
                <span className="inline bg-gradient-to-r from-[#43e3ff]  to-[#060af3] text-transparent bg-clip-text">
                  repo2pdf
                </span>
              </h1>
            </Link>
          </NavigationMenuItem>

          {/* mobile */}
          <span className="flex md:hidden">
            <ModeToggle />

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger className="px-2" asChild>
                <Button variant="outline" size="icon" className="ml-2">
                  <HamburgerMenuIcon
                    className="flex md:hidden h-5 w-5"
                    onClick={() => setIsOpen(true)}
                  />
                </Button>
              </SheetTrigger>

              <SheetContent side={"left"}>
                <SheetHeader>
                  <SheetTitle className="font-bold text-xl">
                    <SheetClose asChild>
                      <Link href="/" className="ml-2 font-bold text-xl flex">
                        <h1 className="inline font-bold">
                          <span className="inline bg-gradient-to-r from-[#43e3ff]  to-[#060af3] text-transparent bg-clip-text">
                            repo2pdf
                          </span>
                        </h1>
                      </Link>
                    </SheetClose>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col justify-center items-center gap-2 mt-4">
                  {routeList.map(({ href, label }: RouteProps) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      passHref
                      className="w-full"
                    >
                      <SheetClose asChild>
                        <Button variant="ghost" className="w-full">
                          {label}
                        </Button>
                      </SheetClose>
                    </Link>
                  ))}
                </nav>
                <SheetFooter className="absolute bottom-6 left-0 right-0 gap-2 mx-4">
                  <Link
                    target="_blank"
                    href={"https://github.com/BankkRoll/repo2pdf"}
                  >
                    <Button variant="ringHoverOutline" className="w-full">
                      <div className="flex items-center">
                        <GitHubLogoIcon className="h-4 w-4" />
                        <span className="ml-1">Star on GitHub</span>{" "}
                      </div>
                      <div className="ml-2 flex items-center gap-1 text-sm md:flex">
                        <StarIcon className="h-4 w-4 text-gray-500 transition-all duration-300 group-hover:text-yellow-300" />
                        <NumberTicker
                          value={stars}
                          className="font-display font-medium"
                        />
                      </div>
                    </Button>
                  </Link>

                  <a
                    rel="noreferrer noopener"
                    href="https://www.npmjs.com/package/repo2pdf"
                    target="_blank"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full">
                      <FaNpm className="mr-2 w-5 h-5" />
                      NPM
                    </Button>
                  </a>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </span>

          <div className="hidden md:flex gap-2">
            <Link href="/" passHref>
              <Button variant="linkHover2" className="font-bold">
                Home
              </Button>
            </Link>
            <Link href="/#about" passHref>
              <Button variant="linkHover2" className="font-bold">
                About
              </Button>
            </Link>
            <Link href="/#faq" passHref>
              <Button variant="linkHover2" className="font-bold">
                FAQ
              </Button>
            </Link>
            <Link href="/create" passHref>
              <Button variant="linkHover2" className="font-bold mr-6">
                Create
              </Button>
            </Link>

            <Link
              target="_blank"
              href={"https://github.com/BankkRoll/repo2pdf"}
            >
              <Button variant="ringHoverOutline">
                <div className="flex items-center">
                  <GitHubLogoIcon className="h-4 w-4" />
                  <span className="ml-1">Star on GitHub</span>{" "}
                </div>
                <div className="ml-2 flex items-center gap-1 text-sm md:flex">
                  <StarIcon className="h-4 w-4 text-gray-500 transition-all duration-300 group-hover:text-yellow-300" />
                  <NumberTicker
                    value={stars}
                    className="font-display font-medium"
                  />
                </div>
              </Button>
            </Link>

            <a
              rel="noreferrer noopener"
              href="https://www.npmjs.com/package/repo2pdf"
              target="_blank"
            >
              <Button variant="ringHoverOutline" size="icon">
                <FaNpm className="w-5 h-5" />
              </Button>
            </a>

            <ModeToggle />
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
};
