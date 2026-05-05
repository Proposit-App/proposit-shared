import type { TBrandAsset } from "./types.js"
import type { TColorScheme } from "../colors.js"
import { propositLogoBlack } from "./proposit-logo-black.js"
import { propositLogoWhite } from "./proposit-logo-white.js"
import { propositLetterLogoBlack } from "./proposit-letter-logo-black.js"

export { propositLogoBlack, propositLogoWhite, propositLetterLogoBlack }
export type { TBrandAsset }

export const propositLogoFor = (scheme: TColorScheme): TBrandAsset =>
    scheme === "dark" ? propositLogoWhite : propositLogoBlack
