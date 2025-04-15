import { proxy, subscribe, useSnapshot } from "valtio";
import { MagnetLink } from "./utils/magnet";
import { parseFirstTvShowName, parseSeasons } from "./services/tvShowService";

type SuggestionPill = {
  type: "showname" | "season" | "library";
  value: string | number;
};

type State = {
  magnetLinks: MagnetLink[];
  suggestions: SuggestionPill[];
  savePath: string;
};

const initialState: State = {
  magnetLinks: [],
  suggestions: [
    { type: "library", value: "Live Action Series" },
    { type: "library", value: "Anime Series" },
  ],
  savePath: "/storage/Library/Temp/",
};

export const store = proxy<State>(initialState);

// Subscribe to magnetLinks changes to update suggestions
subscribe(store.magnetLinks, async () => {
  if (store.magnetLinks.length > 0) {
    // Parse show name from first link
    try {
      const showName = await parseFirstTvShowName(store.magnetLinks);
      if (showName) {
        const newSuggestion = { type: "showname" as const, value: showName };
        if (
          !store.suggestions.some(
            (s) => s.type === "showname" && s.value === showName,
          )
        ) {
          store.suggestions.push(newSuggestion);
        }
      }
    } catch (error) {
      console.error("❌ Error parsing show name:", error);
    }

    // Parse seasons from all links
    try {
      const seasons = parseSeasons(store.magnetLinks);
      seasons.forEach((season) => {
        const newSuggestion = { type: "season" as const, value: season };
        if (
          !store.suggestions.some(
            (s) => s.type === "season" && s.value === season,
          )
        ) {
          store.suggestions.push(newSuggestion);
        }
      });
    } catch (error) {
      console.error("❌ Error parsing seasons:", error);
    }
  }
});

export const actions = {
  addMagnetLinks: (links: readonly MagnetLink[]) => {
    const existingUrls = new Set(
      store.magnetLinks.map((link) => link.magnetUrl),
    );
    const newLinks = links.filter((link) => !existingUrls.has(link.magnetUrl));
    store.magnetLinks.push(...newLinks);
  },

  removeMagnetLink: (index: number) => {
    store.magnetLinks.splice(index, 1);
  },

  clearMagnetLinks: () => {
    store.magnetLinks = [];
  },

  addSuggestion: (suggestion: SuggestionPill) => {
    if (
      !store.suggestions.some(
        (s) => s.type === suggestion.type && s.value === suggestion.value,
      )
    ) {
      store.suggestions.push(suggestion);
    }
  },

  addSuggestions: (suggestions: SuggestionPill[]) => {
    suggestions.forEach((suggestion) => {
      if (
        !store.suggestions.some(
          (s) => s.type === suggestion.type && s.value === suggestion.value,
        )
      ) {
        store.suggestions.push(suggestion);
      }
    });
  },

  applySuggestion: (suggestion: SuggestionPill) => {
    const parts = store.savePath.split("/").filter(Boolean);
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
    store.savePath = `/${parts.join("/")}/`;
    console.log("📁 Updated save path:", store.savePath);
  },

  setSavePath: (path: string) => {
    store.savePath = path;
  },
};

export const useStore = () => useSnapshot(store);
