/** Where "create a shop" CTAs should send users based on auth state. */
export function createShopPath(isAuthenticated: boolean): string {
  return isAuthenticated ? "/dashboard/shops/new" : "/signup";
}
