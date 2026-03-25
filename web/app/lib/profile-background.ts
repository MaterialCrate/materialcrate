export const DEFAULT_PROFILE_BACKGROUND =
  "bg-linear-to-br from-[#E1761F] via-[#ffecdc] to-stone-200";

export const isDefaultProfileBackground = (value?: string | null) =>
  !value || value === DEFAULT_PROFILE_BACKGROUND;

export const getProfileBackgroundPresentation = (value?: string | null) => {
  if (isDefaultProfileBackground(value)) {
    return {
      className: DEFAULT_PROFILE_BACKGROUND,
      style: undefined,
    } as const;
  }

  return {
    className: "bg-[#E8E1D7] bg-cover bg-center",
    style: {
      backgroundImage: `url("${value}")`,
    },
  } as const;
};
