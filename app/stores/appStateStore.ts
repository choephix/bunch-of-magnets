import { proxy, subscribe, useSnapshot } from "valtio";
import { MagnetLink } from "../utils/magnet";
import { parseFirstTvShowName, parseSeasons } from "../services/tvShowService";
import { settingsStore } from "./settingsStore";

type SuggestionPill = {
  type: "showname" | "season" | "library";
  value: string | number;
};

type State = {
  magnetLinks: MagnetLink[];
  dynamicSuggestions: SuggestionPill[];
  savePath: string;
};

const initialState: State = {
  magnetLinks: [],
  dynamicSuggestions: [],
  savePath: "/storage/Library/_/",
};

export const appStateStore = proxy<State>(initialState);

// Helper to sort suggestions by type (library, then show, then season)
const sortSuggestionsByType = () => {
  const typeOrder = { library: 0, showname: 1, season: 2 };
  appStateStore.dynamicSuggestions.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
};

// Helper to update suggestions based on current magnetLinks
const updateSuggestionsFromMagnetLinks = async (
  magnetLinks: readonly MagnetLink[]
) => {
  // Parse show name from first link
  try {
    const showName = await parseFirstTvShowName(magnetLinks);
    if (showName) {
      const newSuggestion = { type: "showname" as const, value: showName };
      if (!appStateStore.dynamicSuggestions.some(s => s.type === "showname" && s.value === showName)) {
        appStateStore.dynamicSuggestions.push(newSuggestion);
      }
    }
  } catch (error) {
    console.error("❌ Error parsing show name:", error);
  }

  // Parse seasons from all links
  try {
    const seasons = parseSeasons(magnetLinks);
    seasons.forEach(season => {
      const newSuggestion = { type: "season" as const, value: season };
      if (!appStateStore.dynamicSuggestions.some(s => s.type === "season" && s.value === season)) {
        appStateStore.dynamicSuggestions.push(newSuggestion);
      }
    });
  } catch (error) {
    console.error("❌ Error parsing seasons:", error);
  }

  // Sort suggestions by type
  sortSuggestionsByType();
};

export const appStateActions = {
  addMagnetLinks: async (links: readonly MagnetLink[]) => {
    const existingUrls = new Set(
      appStateStore.magnetLinks.map((link) => link.magnetUrl),
    );
    const newLinks = links.filter((link) => !existingUrls.has(link.magnetUrl));
    appStateStore.magnetLinks.unshift(...newLinks);

    if (newLinks.length > 0) {
      await updateSuggestionsFromMagnetLinks(links);
    }
  },

  removeMagnetLink: (index: number) => {
    appStateStore.magnetLinks.splice(index, 1);
  },

  clearMagnetLinks: () => {
    appStateStore.magnetLinks = [];
  },

  addSuggestion: (suggestion: SuggestionPill) => {
    if (
      !appStateStore.dynamicSuggestions.some(
        (s) => s.type === suggestion.type && s.value === suggestion.value,
      )
    ) {
      appStateStore.dynamicSuggestions.unshift(suggestion);
    }
  },

  addSuggestions: (suggestions: SuggestionPill[]) => {
    suggestions.forEach((suggestion) => {
      if (
        !appStateStore.dynamicSuggestions.some(
          (s) => s.type === suggestion.type && s.value === suggestion.value,
        )
      ) {
        appStateStore.dynamicSuggestions.unshift(suggestion);
      }
    });
  },

  applySuggestion: (suggestion: SuggestionPill) => {
    const parts = appStateStore.savePath.split("/").filter(Boolean);
    const targetIndex =
      suggestion.type === "library"
        ? 2
        : suggestion.type === "showname"
          ? 3
          : suggestion.type === "season"
            ? 4
            : -1;

    if (targetIndex === -1) return;

    // Ensure we have enough parts to the left
    while (parts.length <= targetIndex) {
      if (parts.length === 0) parts.push("storage");
      else if (parts.length === 1) parts.push("Library");
      else if (parts.length === 2) parts.push("_");
      else if (parts.length === 3) parts.push("_");
      else if (parts.length === 4) parts.push("_");
    }

    // Update the target part
    parts[targetIndex] =
      suggestion.type === "season"
        ? `Season ${suggestion.value}`
        : (suggestion.value as string);

    // Reconstruct the path
    appStateStore.savePath = `/${parts.join("/")}/`;
    console.log("📁 Updated save path:", appStateStore.savePath);
  },

  setSavePath: (path: string) => {
    appStateStore.savePath = path;
  },

  toggleIgnoreMagnetLink: (index: number) => {
    const link = appStateStore.magnetLinks[index];
    if (link) {
      link.ignore = !link.ignore;
    }
  },

  sortMagnetLinksByName: () => {
    appStateStore.magnetLinks.sort((a, b) => 
      (a.displayName || a.magnetUrl).localeCompare(b.displayName || b.magnetUrl)
    );
  },

  selectAllMagnetLinks: () => {
    appStateStore.magnetLinks.forEach(link => link.ignore = false);
  },

  selectNoneMagnetLinks: () => {
    appStateStore.magnetLinks.forEach(link => link.ignore = true);
  },
};

export const useAppState = () => useSnapshot(appStateStore);

export const getAllSuggestionsSnapshot = () => {
  const appState = useSnapshot(appStateStore);
  const settings = useSnapshot(settingsStore);
  
  const librarySuggestions = Object.entries(settings.librarySuggestions)
    .filter(([_, enabled]) => enabled)
    .map(([type]) => ({ type: "library" as const, value: type }));
  
  return [...librarySuggestions, ...appState.dynamicSuggestions];
}; 
