import type { BoardItemStyle } from "../model/boardItems";

export const componentThemeIds = [
  "clean",
  "glass",
  "dark",
  "warm",
  "mint",
  "sky",
  "indigo",
  "rose",
  "amber",
  "emerald",
  "slate",
  "daily-purple",
  "daily-lime",
  "daily-coral",
  "ocean",
  "violet",
  "graphite",
  "blue-matte",
  "blue-pastel",
  "blue-metallic",
  "pastel-peach",
  "metallic-rose",
  "gradient-aurora",
  "gradient-sunset",
  "gradient-ocean",
] as const;

export type ComponentThemeId = (typeof componentThemeIds)[number];
export type ComponentThemeColorScheme = "light" | "dark";

export type ComponentThemePreset = {
  id: ComponentThemeId;
  name: string;
  lightStyle: BoardItemStyle;
  darkStyle: BoardItemStyle;
};

export type ComponentTheme = {
  id: ComponentThemeId;
  name: string;
  style: BoardItemStyle;
};

export const baseComponentThemeStyle: BoardItemStyle = {
  backgroundColor: "#ffffff",
  borderColor: "#dee2e6",
  borderWidth: 1,
  borderRadius: 8,
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: 18,
  fontSizeLocked: false,
  padding: 2,
  searchButtonBackgroundColor: "#171717",
  searchButtonTextColor: "#ffffff",
  searchInputBackgroundColor: "#ffffff",
  searchInputTextColor: "#1d2939",
  textColor: "#1d2939",
};

const baseDarkComponentThemeStyle: BoardItemStyle = {
  ...baseComponentThemeStyle,
  backgroundColor: "rgba(20,24,30,0.92)",
  borderColor: "rgba(168,179,207,0.24)",
  searchButtonBackgroundColor: "#f5f7fa",
  searchButtonTextColor: "#0e1217",
  searchInputBackgroundColor: "rgba(31,36,43,0.94)",
  searchInputTextColor: "#f5f7fa",
  textColor: "#f5f7fa",
};

type PresetColors = {
  id: ComponentThemeId;
  name: string;
  light: {
    accent: string;
    background: string;
    backgroundImage?: string;
    border: string;
    input: string;
    text: string;
    buttonText?: string;
  };
  dark: {
    accent: string;
    background: string;
    backgroundImage?: string;
    border: string;
    input: string;
    text: string;
    buttonText?: string;
  };
};

function createColorPreset({ id, name, light, dark }: PresetColors): ComponentThemePreset {
  return {
    id,
    name,
    lightStyle: {
      ...baseComponentThemeStyle,
      backgroundColor: light.background,
      backgroundImage: light.backgroundImage ?? "none",
      borderColor: light.border,
      searchButtonBackgroundColor: light.accent,
      searchButtonTextColor: light.buttonText ?? "#ffffff",
      searchInputBackgroundColor: light.input,
      searchInputTextColor: light.text,
      textColor: light.text,
    },
    darkStyle: {
      ...baseDarkComponentThemeStyle,
      backgroundColor: dark.background,
      backgroundImage: dark.backgroundImage ?? "none",
      borderColor: dark.border,
      searchButtonBackgroundColor: dark.accent,
      searchButtonTextColor: dark.buttonText ?? "#ffffff",
      searchInputBackgroundColor: dark.input,
      searchInputTextColor: dark.text,
      textColor: dark.text,
    },
  };
}

export const componentThemePresets: ComponentThemePreset[] = [
  {
    id: "clean",
    name: "Limpio",
    lightStyle: baseComponentThemeStyle,
    darkStyle: baseDarkComponentThemeStyle,
  },
  {
    id: "glass",
    name: "Cristal",
    lightStyle: {
      ...baseComponentThemeStyle,
      backgroundColor: "rgba(255,255,255,0.72)",
      borderColor: "rgba(255,255,255,0.56)",
      borderRadius: 10,
      searchInputBackgroundColor: "rgba(255,255,255,0.86)",
    },
    darkStyle: {
      ...baseDarkComponentThemeStyle,
      backgroundColor: "rgba(14,18,23,0.64)",
      borderColor: "rgba(255,255,255,0.18)",
      borderRadius: 10,
      searchInputBackgroundColor: "rgba(31,36,43,0.74)",
    },
  },
  createColorPreset({
    id: "dark",
    name: "Monocromo",
    light: {
      accent: "#111827",
      background: "rgba(248,250,252,0.88)",
      border: "rgba(71,85,105,0.34)",
      input: "rgba(255,255,255,0.90)",
      text: "#111827",
    },
    dark: {
      accent: "#f9fafb",
      background: "rgba(17,24,39,0.92)",
      border: "rgba(148,163,184,0.34)",
      input: "rgba(31,41,55,0.90)",
      text: "#f9fafb",
      buttonText: "#111827",
    },
  }),
  createColorPreset({
    id: "warm",
    name: "Calido",
    light: {
      accent: "#9a3412",
      background: "rgba(255,247,237,0.84)",
      border: "rgba(251,146,60,0.40)",
      input: "rgba(255,251,235,0.84)",
      text: "#431407",
    },
    dark: {
      accent: "#fb923c",
      background: "rgba(49,27,15,0.92)",
      border: "rgba(251,146,60,0.42)",
      input: "rgba(67,35,17,0.92)",
      text: "#ffedd5",
      buttonText: "#241006",
    },
  }),
  createColorPreset({
    id: "mint",
    name: "Menta",
    light: {
      accent: "#047857",
      background: "rgba(236,253,245,0.84)",
      border: "rgba(16,185,129,0.36)",
      input: "rgba(240,253,250,0.84)",
      text: "#064e3b",
    },
    dark: {
      accent: "#34d399",
      background: "rgba(9,43,35,0.92)",
      border: "rgba(52,211,153,0.38)",
      input: "rgba(13,58,47,0.92)",
      text: "#d1fae5",
      buttonText: "#06281f",
    },
  }),
  createColorPreset({
    id: "sky",
    name: "Cielo",
    light: {
      accent: "#1d4ed8",
      background: "rgba(239,246,255,0.84)",
      border: "rgba(59,130,246,0.36)",
      input: "rgba(248,250,252,0.84)",
      text: "#172554",
    },
    dark: {
      accent: "#60a5fa",
      background: "rgba(12,36,63,0.92)",
      border: "rgba(96,165,250,0.38)",
      input: "rgba(16,48,83,0.92)",
      text: "#dbeafe",
      buttonText: "#071b31",
    },
  }),
  createColorPreset({
    id: "indigo",
    name: "Indigo",
    light: {
      accent: "#4338ca",
      background: "rgba(238,242,255,0.84)",
      border: "rgba(99,102,241,0.36)",
      input: "rgba(248,250,252,0.84)",
      text: "#312e81",
    },
    dark: {
      accent: "#818cf8",
      background: "rgba(30,27,75,0.92)",
      border: "rgba(129,140,248,0.38)",
      input: "rgba(40,36,96,0.92)",
      text: "#e0e7ff",
      buttonText: "#17143d",
    },
  }),
  createColorPreset({
    id: "rose",
    name: "Rosa",
    light: {
      accent: "#be123c",
      background: "rgba(255,241,242,0.84)",
      border: "rgba(244,63,94,0.34)",
      input: "rgba(255,247,247,0.84)",
      text: "#881337",
    },
    dark: {
      accent: "#fb7185",
      background: "rgba(59,20,33,0.92)",
      border: "rgba(251,113,133,0.38)",
      input: "rgba(76,25,42,0.92)",
      text: "#ffe4e6",
      buttonText: "#3a0b18",
    },
  }),
  createColorPreset({
    id: "amber",
    name: "Ambar",
    light: {
      accent: "#b45309",
      background: "rgba(255,251,235,0.84)",
      border: "rgba(245,158,11,0.38)",
      input: "rgba(255,255,255,0.84)",
      text: "#78350f",
    },
    dark: {
      accent: "#fbbf24",
      background: "rgba(56,38,13,0.92)",
      border: "rgba(251,191,36,0.40)",
      input: "rgba(72,48,14,0.92)",
      text: "#fef3c7",
      buttonText: "#352006",
    },
  }),
  createColorPreset({
    id: "emerald",
    name: "Esmeralda",
    light: {
      accent: "#065f46",
      background: "rgba(209,250,229,0.82)",
      border: "rgba(16,185,129,0.42)",
      input: "rgba(236,253,245,0.84)",
      text: "#064e3b",
    },
    dark: {
      accent: "#34d399",
      background: "rgba(8,45,34,0.92)",
      border: "rgba(52,211,153,0.42)",
      input: "rgba(11,58,44,0.92)",
      text: "#d1fae5",
      buttonText: "#05271d",
    },
  }),
  createColorPreset({
    id: "slate",
    name: "Pizarra",
    light: {
      accent: "#334155",
      background: "rgba(248,250,252,0.86)",
      border: "rgba(100,116,139,0.36)",
      input: "rgba(255,255,255,0.86)",
      text: "#0f172a",
    },
    dark: {
      accent: "#94a3b8",
      background: "rgba(30,41,59,0.92)",
      border: "rgba(148,163,184,0.36)",
      input: "rgba(40,53,72,0.92)",
      text: "#f1f5f9",
      buttonText: "#172033",
    },
  }),
  createColorPreset({
    id: "daily-purple",
    name: "Daily morado",
    light: {
      accent: "#a21caf",
      background: "rgba(250,245,255,0.88)",
      border: "rgba(206,61,243,0.30)",
      input: "rgba(255,255,255,0.88)",
      text: "#581c62",
    },
    dark: {
      accent: "#ce3df3",
      background: "rgba(14,18,23,0.92)",
      border: "rgba(206,61,243,0.32)",
      input: "rgba(28,31,38,0.94)",
      text: "#f5f7fa",
    },
  }),
  createColorPreset({
    id: "daily-lime",
    name: "Daily lima",
    light: {
      accent: "#7a9e00",
      background: "rgba(248,255,230,0.88)",
      border: "rgba(143,184,0,0.34)",
      input: "rgba(255,255,255,0.88)",
      text: "#344500",
    },
    dark: {
      accent: "#c9ff3d",
      background: "rgba(20,24,30,0.92)",
      border: "rgba(201,255,61,0.32)",
      input: "rgba(31,36,43,0.94)",
      text: "#f5f7fa",
      buttonText: "#0e1217",
    },
  }),
  createColorPreset({
    id: "daily-coral",
    name: "Daily coral",
    light: {
      accent: "#dc4f44",
      background: "rgba(255,244,242,0.88)",
      border: "rgba(255,111,97,0.34)",
      input: "rgba(255,255,255,0.88)",
      text: "#68201a",
    },
    dark: {
      accent: "#ff6f61",
      background: "rgba(14,18,23,0.92)",
      border: "rgba(255,111,97,0.32)",
      input: "rgba(28,31,38,0.94)",
      text: "#f5f7fa",
      buttonText: "#0e1217",
    },
  }),
  createColorPreset({
    id: "ocean",
    name: "Oceano",
    light: {
      accent: "#0e7490",
      background: "rgba(236,254,255,0.86)",
      border: "rgba(6,182,212,0.36)",
      input: "rgba(247,254,255,0.88)",
      text: "#164e63",
    },
    dark: {
      accent: "#22d3ee",
      background: "rgba(8,47,56,0.92)",
      border: "rgba(34,211,238,0.38)",
      input: "rgba(10,61,72,0.92)",
      text: "#cffafe",
      buttonText: "#07323a",
    },
  }),
  createColorPreset({
    id: "violet",
    name: "Violeta",
    light: {
      accent: "#7c3aed",
      background: "rgba(245,243,255,0.86)",
      border: "rgba(139,92,246,0.36)",
      input: "rgba(255,255,255,0.88)",
      text: "#4c1d95",
    },
    dark: {
      accent: "#a78bfa",
      background: "rgba(42,25,73,0.92)",
      border: "rgba(167,139,250,0.38)",
      input: "rgba(54,32,92,0.92)",
      text: "#ede9fe",
      buttonText: "#25143f",
    },
  }),
  createColorPreset({
    id: "graphite",
    name: "Grafito",
    light: {
      accent: "#3f3f46",
      background: "rgba(244,244,245,0.88)",
      border: "rgba(82,82,91,0.34)",
      input: "rgba(255,255,255,0.88)",
      text: "#27272a",
    },
    dark: {
      accent: "#d4d4d8",
      background: "rgba(24,24,27,0.94)",
      border: "rgba(161,161,170,0.34)",
      input: "rgba(39,39,42,0.94)",
      text: "#fafafa",
      buttonText: "#18181b",
    },
  }),
  createColorPreset({
    id: "blue-matte",
    name: "Azul mate",
    light: {
      accent: "#426b91",
      background: "rgba(222,232,239,0.94)",
      border: "rgba(70,105,135,0.30)",
      input: "rgba(238,244,247,0.92)",
      text: "#253b4d",
    },
    dark: {
      accent: "#86a9c5",
      background: "rgba(35,52,66,0.96)",
      border: "rgba(134,169,197,0.30)",
      input: "rgba(45,66,82,0.94)",
      text: "#e2edf4",
      buttonText: "#1e3444",
    },
  }),
  createColorPreset({
    id: "blue-pastel",
    name: "Azul pastel",
    light: {
      accent: "#5f8fc7",
      background: "rgba(231,242,255,0.94)",
      border: "rgba(120,164,211,0.34)",
      input: "rgba(246,250,255,0.94)",
      text: "#31557c",
    },
    dark: {
      accent: "#9cc8f5",
      background: "rgba(35,51,73,0.96)",
      border: "rgba(156,200,245,0.34)",
      input: "rgba(44,65,91,0.94)",
      text: "#e5f2ff",
      buttonText: "#20374f",
    },
  }),
  createColorPreset({
    id: "blue-metallic",
    name: "Azul metalico",
    light: {
      accent: "#285f91",
      background: "#dce8f2",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(180,204,224,0.94) 46%, rgba(235,244,250,0.96) 100%)",
      border: "rgba(64,104,139,0.50)",
      input: "rgba(245,249,252,0.82)",
      text: "#1d3d59",
    },
    dark: {
      accent: "#8ec5ef",
      background: "#22394c",
      backgroundImage:
        "linear-gradient(145deg, rgba(65,91,113,0.98) 0%, rgba(24,43,59,0.98) 48%, rgba(55,79,98,0.98) 100%)",
      border: "rgba(158,195,222,0.44)",
      input: "rgba(20,38,53,0.78)",
      text: "#edf7ff",
      buttonText: "#173247",
    },
  }),
  createColorPreset({
    id: "pastel-peach",
    name: "Durazno pastel",
    light: {
      accent: "#c97b6b",
      background: "rgba(255,235,228,0.94)",
      border: "rgba(218,145,130,0.34)",
      input: "rgba(255,248,245,0.94)",
      text: "#70443c",
    },
    dark: {
      accent: "#efac9e",
      background: "rgba(75,48,45,0.96)",
      border: "rgba(239,172,158,0.34)",
      input: "rgba(91,58,54,0.94)",
      text: "#ffebe7",
      buttonText: "#472c29",
    },
  }),
  createColorPreset({
    id: "metallic-rose",
    name: "Rosa metalico",
    light: {
      accent: "#9b5d70",
      background: "#eadde2",
      backgroundImage:
        "linear-gradient(140deg, rgba(255,249,251,0.98) 0%, rgba(203,172,182,0.94) 48%, rgba(244,229,234,0.98) 100%)",
      border: "rgba(137,83,101,0.44)",
      input: "rgba(255,249,251,0.82)",
      text: "#583541",
    },
    dark: {
      accent: "#d9a1b2",
      background: "#4a3039",
      backgroundImage:
        "linear-gradient(140deg, rgba(102,69,80,0.98) 0%, rgba(55,34,42,0.98) 48%, rgba(84,53,64,0.98) 100%)",
      border: "rgba(222,167,185,0.42)",
      input: "rgba(53,32,40,0.80)",
      text: "#fff0f4",
      buttonText: "#402630",
    },
  }),
  createColorPreset({
    id: "gradient-aurora",
    name: "Aurora",
    light: {
      accent: "#6d55d9",
      background: "#e7fbf5",
      backgroundImage:
        "linear-gradient(135deg, rgba(218,255,240,0.94) 0%, rgba(223,231,255,0.94) 52%, rgba(248,225,255,0.94) 100%)",
      border: "rgba(91,113,190,0.34)",
      input: "rgba(255,255,255,0.76)",
      text: "#34425f",
    },
    dark: {
      accent: "#b8a4ff",
      background: "#122d32",
      backgroundImage:
        "linear-gradient(135deg, rgba(16,62,53,0.98) 0%, rgba(29,37,74,0.98) 52%, rgba(62,29,69,0.98) 100%)",
      border: "rgba(176,178,255,0.34)",
      input: "rgba(16,25,43,0.72)",
      text: "#f1efff",
      buttonText: "#251f50",
    },
  }),
  createColorPreset({
    id: "gradient-sunset",
    name: "Atardecer",
    light: {
      accent: "#d45f68",
      background: "#fff0dc",
      backgroundImage:
        "linear-gradient(135deg, rgba(255,231,196,0.96) 0%, rgba(255,205,204,0.94) 50%, rgba(229,213,255,0.94) 100%)",
      border: "rgba(210,102,111,0.34)",
      input: "rgba(255,250,246,0.78)",
      text: "#6b3543",
    },
    dark: {
      accent: "#ff9b8f",
      background: "#432531",
      backgroundImage:
        "linear-gradient(135deg, rgba(83,47,28,0.98) 0%, rgba(83,35,48,0.98) 50%, rgba(48,35,75,0.98) 100%)",
      border: "rgba(255,155,143,0.34)",
      input: "rgba(54,27,39,0.76)",
      text: "#fff0e8",
      buttonText: "#47242b",
    },
  }),
  createColorPreset({
    id: "gradient-ocean",
    name: "Oceano degradado",
    light: {
      accent: "#087e9a",
      background: "#e1f7fb",
      backgroundImage:
        "linear-gradient(135deg, rgba(224,252,255,0.96) 0%, rgba(202,232,255,0.94) 52%, rgba(224,222,255,0.94) 100%)",
      border: "rgba(35,143,177,0.34)",
      input: "rgba(247,254,255,0.78)",
      text: "#174e66",
    },
    dark: {
      accent: "#52d9ef",
      background: "#0b3543",
      backgroundImage:
        "linear-gradient(135deg, rgba(7,60,67,0.98) 0%, rgba(12,43,73,0.98) 52%, rgba(35,34,82,0.98) 100%)",
      border: "rgba(82,217,239,0.36)",
      input: "rgba(7,35,53,0.76)",
      text: "#e1faff",
      buttonText: "#073540",
    },
  }),
];

export function isComponentThemeId(value: unknown): value is ComponentThemeId {
  return typeof value === "string" && componentThemeIds.includes(value as ComponentThemeId);
}

export function getComponentTheme(
  themeId?: string,
  colorScheme: ComponentThemeColorScheme = "light",
): ComponentTheme {
  const preset =
    componentThemePresets.find((theme) => theme.id === themeId) ??
    componentThemePresets[0];

  return {
    id: preset.id,
    name: preset.name,
    style: colorScheme === "dark" ? preset.darkStyle : preset.lightStyle,
  };
}
