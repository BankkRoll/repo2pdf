// src/components/docs/layout/sidebar.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import {
  BookIcon,
  FileIcon,
  LucideIcon,
  RocketIcon,
  SettingsIcon,
} from "lucide-react";
import { Route, docsConfig } from "./config";
import { useEffect, useState } from "react";

import { Button } from "../../ui/button";
import Link from "next/link";
import { useRouter } from "next/router";

type IconMap = {
  [key: string]: LucideIcon;
};

const iconMap: IconMap = {
  BookIcon,
  FileIcon,
  RocketIcon,
  SettingsIcon,
};

export default function Sidebar() {
  const router = useRouter();
  const { routes } = docsConfig;
  const [activeItems, setActiveItems] = useState<string[]>([]);

  useEffect(() => {
    const activePaths = new Set<string>();
    const setActivePaths = (routes: Route[], basePath = "") => {
      routes.forEach((route) => {
        const fullPath = `${basePath}/${route.slug}`.replace(/\/+/g, "/");
        if (router.asPath.startsWith(`/docs${fullPath}`)) {
          activePaths.add(basePath);
          if (route.children) {
            setActivePaths(route.children, fullPath);
          }
        }
      });
    };
    setActivePaths(routes);
    setActiveItems(Array.from(activePaths));
  }, [router.asPath, routes]);

  const renderRoutes = (routes: Route[], basePath = "", depth = 0) => {
    return routes.map((route, index) => {
      const fullPath = `${basePath}/${route.slug}`.replace(/\/+/g, "/");
      const isActive = router.asPath === `/docs${fullPath}`;
      const hasChildren = route.children && route.children.length > 0;
      const Icon = route.icon ? iconMap[route.icon] : null;

      return (
        <div key={`${fullPath}-${index}`}>
          {hasChildren ? (
            <AccordionItem value={fullPath} className="my-2">
              <AccordionTrigger>
                <p
                  className={`bg-transparent flex justify-between items-center py-2 px-4 rounded-lg transition-colors duration-200 ${
                    isActive ? "text-blue-600" : ""
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {route.title}
                </p>
              </AccordionTrigger>
              <AccordionContent className="overflow-hidden transition-all duration-200">
                <div style={{ marginLeft: `${depth * 20}px` }}>
                  {renderRoutes(route.children || [], fullPath, depth + 1)}
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : (
            <Link href={`/docs${fullPath}`} passHref>
              <Button
                variant="linkHover2"
                className={`py-2 rounded-lg transition-colors duration-200 ${
                  isActive ? " text-blue-600" : " text-primary"
                }`}
                style={{ marginLeft: `${depth * 20}px` }}
              >
                {Icon && <Icon className="w-4 h-4 mr-2" />}
                {route.title}
              </Button>
            </Link>
          )}
        </div>
      );
    });
  };

  return (
    <nav className="w-64 p-4 border-r shadow-lg">
      <Accordion
        type="multiple"
        value={activeItems}
        onValueChange={setActiveItems}
      >
        {renderRoutes(routes)}
      </Accordion>
    </nav>
  );
}
