import { useState } from "react";
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
import { FaNpm } from "react-icons/fa6";

import {
  DropdownMenuIcon,
  GitHubLogoIcon,
  HamburgerMenuIcon,
} from "@radix-ui/react-icons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RouteProps {
  href: string;
  label: string;
}

const routeList: RouteProps[] = [
  {
    href: "create",
    label: "Create",
  },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <header className="overflow-x-hidden sticky border-b-[1px] top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container h-14 px-4 w-screen flex justify-between ">
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
                  <a
                    rel="noreferrer noopener"
                    href="https://github.com/BankkRoll/repo2pdf"
                    target="_blank"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full">
                      <GitHubLogoIcon className="mr-2 w-5 h-5" />
                      Github
                    </Button>
                  </a>

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
            <Link href="/create" passHref>
              <Button variant="link" className="font-bold mr-6">
                Create
              </Button>
            </Link>

            <a
              rel="noreferrer noopener"
              href="https://github.com/BankkRoll/repo2pdf"
              target="_blank"
            >
              <Button variant="outline" size="icon">
                <GitHubLogoIcon className="w-5 h-5" />
              </Button>
            </a>

            <a
              rel="noreferrer noopener"
              href="https://www.npmjs.com/package/repo2pdf"
              target="_blank"
            >
              <Button variant="outline" size="icon">
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
