"use client";

import { CirclePowerIcon, Menu, StarIcon } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { ModeToggle } from "../ui/mode-toggle";
import NumberTicker from "../ui/number-ticker";
import { Separator } from "@/components/ui/separator";

interface RouteProps {
  href: string;
  label: string;
}

interface FeatureProps {
  title: string;
  description: string;
  href?: string;
}

const routeList: RouteProps[] = [
  {
    href: "#features",
    label: "Features",
  },
  {
    href: "#testimonials",
    label: "Testimonials",
  },
  {
    href: "#faqs",
    label: "FAQ",
  },
];

const featureList: FeatureProps[] = [
  {
    title: "Built in MDX Support",
    description:
      "Built docs for your startup or project easily with ready-to-go MDX support.",
    href: "/docs",
  },
  {
    title: "Build Trust",
    description:
      "Leverages social proof elements to establish trust and credibility.",
  },
  {
    title: "Capture Leads",
    description:
      "Make your lead capture form visually appealing and strategically.",
  },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stars, setStars] = useState<number>(0.1);

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
    <header className="shadow-inner bg-opacity-15 w-[90%] md:w-[70%] lg:w-[75%] lg:max-w-screen-xl top-5 mx-auto sticky border border-secondary z-40 rounded-2xl flex justify-between items-center p-2 bg-card">
      <Link href="/" className="z-10 font-bold text-lg flex items-center">
        <CirclePowerIcon className="bg-gradient-to-tr border-secondary from-primary via-primary/70 to-primary rounded-lg w-9 h-9 mr-2 border text-white" />
        shad-next
      </Link>
      {/* <!-- Mobile --> */}
      <div className="z-10 flex items-center lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Menu
              onClick={() => setIsOpen(!isOpen)}
              className="cursor-pointer lg:hidden"
            />
          </SheetTrigger>

          <SheetContent
            side="left"
            className="flex flex-col justify-between rounded-tr-2xl rounded-br-2xl bg-card border-secondary"
          >
            <div>
              <SheetHeader className="mb-4 ml-4">
                <SheetTitle className="flex items-center">
                  <Link href="/" className="flex items-center">
                    <CirclePowerIcon className="bg-gradient-to-tr border-secondary from-primary via-primary/70 to-primary rounded-lg w-9 h-9 mr-2 border text-white" />
                    shad-next
                  </Link>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-2">
                {routeList.map(({ href, label }) => (
                  <Button
                    key={href}
                    onClick={() => setIsOpen(false)}
                    asChild
                    variant="ghost"
                    className="justify-start text-base"
                  >
                    <Link href={href}>{label}</Link>
                  </Button>
                ))}
              </div>
            </div>

            <SheetFooter className="flex-col sm:flex-col justify-start items-start">
              <Separator className="mb-2" />
              <div className="flex gap-2">
                <Link
                  target="_blank"
                  href={"https://github.com/BankkRoll/shad-next"}
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

                <ModeToggle />
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* <!-- Desktop --> */}
      <NavigationMenu className="z-10 hidden lg:block mx-auto">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-card text-base">
              Features
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid w-[600px] grid-cols-2 gap-5 p-4">
                <img
                  src="https://avatars.githubusercontent.com/u/75042455?v=4"
                  alt="RadixLogo"
                  className="h-full w-full rounded-md object-cover"
                />
                <ul className="flex flex-col gap-2">
                  {featureList.map(({ title, description, href }) => (
                    <li
                      key={title}
                      className="rounded-md p-3 text-sm hover:bg-muted"
                    >
                      {href ? (
                        <Link href={href}>
                          <p className="block">
                            <p className="mb-1 font-semibold leading-none text-foreground">
                              {title}
                            </p>
                            <p className="line-clamp-2 text-muted-foreground">
                              {description}
                            </p>
                          </p>
                        </Link>
                      ) : (
                        <>
                          <p className="mb-1 font-semibold leading-none text-foreground">
                            {title}
                          </p>
                          <p className="line-clamp-2 text-muted-foreground">
                            {description}
                          </p>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            {routeList.map(({ href, label }) => (
              <NavigationMenuLink key={href} asChild>
                <Link href={href} passHref>
                  <Button variant="linkHover2" className="text-base">
                    {label}
                  </Button>
                </Link>
              </NavigationMenuLink>
            ))}
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <div className="z-10 hidden lg:flex gap-2">
        <Link target="_blank" href={"https://github.com/BankkRoll/shad-next"}>
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

        <ModeToggle />
      </div>
    </header>
  );
};
