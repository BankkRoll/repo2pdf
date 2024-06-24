// src/components/docs/config.ts

import config from "../shad-next.config.json";

export interface Route {
  slug: string;
  title: string;
  description?: string;
  icon?: any;
  children?: Route[];
}

export interface Config {
  title: string;
  companyName: string;
  fontFamily: string;
  footerText: string;
  routes: Route[];
}

export const docsConfig: Config = config;
