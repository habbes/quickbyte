
export const layoutDimensions = {
    /**
     * Height of the nav bar used inside the app
     */
    navBarHeight: 60,
    /**
     * Height of the nav bar used on the landing page
     */
    landingNavBarHeight: 74,
    /**
     * Header used on the project page
     */
    projectHeaderHeight: 50,
    /**
     * Header used on the project media page
     */
    projectMediaHeaderHeight: 48,
};

/**
 * Gets the css height of content area that should
 * occupy the remaining height of the viewport
 * after some offset heigth has been used up (e.g. by headers or footers).
 * This is useful for components that need to fill the remaining height
 * and allow vertical scrollbars when they overflow. This helps
 * becauser overflow-y-auto doesn't seem to work well when you don't
 * explicitly set the height property (even flex-1 doesn't seem to
 * get overflow-y-auto to work properly).
 * @param offsetHeight 
 */
export function getRemainingContentHeightCss(offsetHeight: number|string) {
    const offsetCss = typeof offsetHeight === 'string' ? offsetHeight : `${offsetHeight}px`;
    return `calc(100dvh - ${offsetCss})`
}

/**
 * Gets the tailwind height class (e.g. h-[100dvh - 100px]) of content area that should
 * occupy the remaining height of the viewport
 * after some offset heigth has been used up (e.g. by headers or footers).
 * This is useful for components that need to fill the remaining height
 * and allow vertical scrollbars when they overflow. This helps
 * becauser overflow-y-auto doesn't seem to work well when you don't
 * explicitly set the height property (even flex-1 doesn't seem to
 * get overflow-y-auto to work properly).
 * @param offsetHeight 
 */
export function getContentHeightClass(offsetHeight: number|string) {
    return `h-[${getRemainingContentHeightCss(offsetHeight)}]`;
}