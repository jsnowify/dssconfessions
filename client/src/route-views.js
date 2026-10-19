import { lazy } from "react";

const loaders = {
  browse: () => import("./views/BrowseView"),
  submit: () => import("./views/SubmitView"),
  about: () => import("./views/AboutView"),
  details: () => import("./views/DetailsView"),
  faq: () => import("./views/FaqView"),
  privacy: () => import("./views/PrivacyView"),
  "dssc-landing": () => import("./views/DsscLandingView"),
  "guide-how-to-send": () => import("./views/guides/HowToSendGuide"),
  "guide-choose-song": () => import("./views/guides/HowToChooseSongGuide"),
  "guide-is-it-safe": () => import("./views/guides/IsItSafeGuide"),
  "bot-admin": () => import("./views/BotAdminView"),
};

export const routeViews = Object.fromEntries(
  Object.entries(loaders).map(([view, load]) => [view, lazy(load)]),
);

export async function preloadInitialView(view) {
  if (!loaders[view]) return {};
  try {
    const module = await loaders[view]();
    return { [view]: module.default };
  } catch {
    // Let the normal lazy route and ErrorBoundary display the retry UI.
    return {};
  }
}
